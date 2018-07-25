/* @flow */
import type { MergerConfig, MergerPath, ProxyDescriptor } from '../types';

import { handleMergeIntoDescriptor } from './handlers';

import {
  isType, getProxyDescriptor, getChildProxy, setDescriptorsValue, setDescriptorChild,
} from '../utils';

type PathResultObj = {
  path: void | MergerPath,
  descriptor: void | ProxyDescriptor<*>,
};

// reuse the pathResult object for perf and gc gains
const pathResult: PathResultObj = {
  // where did we end up if not done?
  path: undefined,
  // what is the value of the descriptor if done
  descriptor: undefined,
  source: undefined,
};

function getExpectedType(pathType) {
  switch (pathType) {
    case Map: {
      return 'map';
    }
    case Set: {
      return 'set';
    }
    case Array: {
      return 'array';
    }
    case Object: {
      return 'object';
    }
    default: {
      return isType(pathType);
    }
  }
}

function getNextPathType(path, i) {
  const next = path[i + 1];
  if (Array.isArray(next)) {
    return getExpectedType(next);
  }
  return typeof path[i + 1] === 'number' ? 'array' : 'object';
}

/**
 * Iterates the base descriptor and attempts to capture
 * the descriptor at the requested path.  It will return
 * an object describing the results of the iteration which
 * gives the result, the path at which it stopped, and the
 * descriptor (if possible).
 * @param {*} path
 * @param {*} base
 */
function getDescriptorAtPath(baseDescriptor, path) {
  let descriptor = baseDescriptor;
  // we will change this as we iterate so that it is
  // pointing to the latest source value
  let pathType;
  const remainingPath = path.slice();
  for (const route of path) {
    if (!descriptor) {
      break;
    }
    let nextDescriptor;
    let key;

    if (Array.isArray(route)) {
      // we are handling a MergerDescriptor
      // which is used to identify the expected
      // types of the key in our path.
      [pathType, key] = route;
      pathType = getExpectedType(pathType);
    } else {
      // if we dont have a tuple then we use the base
      // type if possible to determine the type we should
      // use.
      pathType = undefined;
      key = route;
    }
    // does our descriptor already have this path?
    if (descriptor.children.has(key)) {
      // this indicates that this value has already generated
      // a child descriptor (by a mutation of draft previous to
      // this merge).  When this is the case, we simply capture
      // the child descriptor and continue on.
      nextDescriptor = descriptor.children.get(key);
    } else {
      const childProxy = getChildProxy(descriptor, key);
      if (childProxy === null || childProxy === undefined) {
        // when getChildProxy returns null it means that it was
        // not going to be able to create a childDescriptor based
        // on the requested change of the parent that would occur.
        //
        // in this case, we will be replacing the value of the child
        // (if any) with the remaining parts of our requested value
        break;
      } else if (descriptor.children.has(key)) {
        nextDescriptor = descriptor.children.get(key);
      } else {
        // this should not occur
        throw new Error('UNKNOWN IMMUTA ISSUE?! ELSE REACHED WHILE PARSING');
      }
    }

    if (!nextDescriptor) {
      throw new Error('No nextDescriptor');
    }

    if (pathType) {
      // when path type is provided, we check to confirm the
      // type of this descriptor matches the constrained
      // type.  If it doesn't, we will replace starting
      // here within our merge.
      if (pathType !== nextDescriptor.type) {
        break;
      }
    }
    remainingPath.shift();
    descriptor = nextDescriptor;
  }
  pathResult.descriptor = descriptor;
  pathResult.path = remainingPath;
}

/**
 * When a path is provided, we are merging
 * our `target` with any values found at the
 * given path.
 *
 * `target` will take precedence and overwrite
 * any value if a merge can not be done.
 *
 * By default, we will attempt to use the type of
 * the `source` to iterate through the `target` path.
 *
 * If a MergerDescriptor (tuple [type, value]) is found
 * along the path and the types do not match, the value
 * will be replaced starting at that value instead.
 *
 * As we iterate through the path, we will attempt to directly
 * interact with the ProxyDescriptor so that we can skip over
 * the more intensive logic that is required by the Proxy itself.
 *
 * This will yield strong perf benefits when a merge is done
 * during a larger operation as we do not need to generate or
 * query proxies at every key along the way.
 *
 * We will return a descriptive object with the resulting
 * descriptor and source values that can then be used to
 * conduct a normal merge operation in a way that will act
 * as requested.
 */
function prepareMergeAtPath(_descriptor, _path, target) {
  getDescriptorAtPath(_descriptor, _path);
  const { path } = pathResult;
  if (path && path.length) {
    // the source object does not contain mergeable keys starting at
    // the path received and we will need to add them to the draft
    // object leading up to the path provided so that a merge may be
    // done as required.
    path.forEach((route, i) => {
      const { descriptor } = pathResult;
      if (!descriptor) {
        throw new Error('Empty Descriptor in Merge New Keys?');
      }
      let pathType;
      let key;

      // each path in the route will tell us what we need to set
      // on our proxy
      if (Array.isArray(route)) {
        // we are handling a MergerDescriptor
        // which is used to identify the expected
        // types of the key in our path.
        [pathType, key] = route;
        pathType = getExpectedType(pathType);
      } else {
        // if we dont have a tuple we assume an Object type
        // if we receive a string, and an Array if we receive
        // a number.
        pathType = getNextPathType(path, i - 1);
        key = route;
      }
      if (i === path.length - 1) {
        setDescriptorChild(descriptor, key, target);
      } else {
        switch (pathType) {
          case 'object': {
            setDescriptorChild(descriptor, key, {});
            break;
          }
          case 'array': {
            setDescriptorChild(descriptor, key, []);
            break;
          }
          case 'map': {
            setDescriptorChild(descriptor, key, new Map());
            break;
          }
          case 'set': {
            setDescriptorChild(descriptor, key, new Set());
            break;
          }
          default: {
            throw new TypeError('Unknown Immuta Type in Merge New Keys');
          }
        }
        pathResult.descriptor = descriptor.children.get(key);
      }
    });
    pathResult.descriptor = undefined;
    pathResult.path = undefined;
  }

  return pathResult;
}

export function merge<+D, +T: Object, +C: MergerConfig>(draft: D, target: T, config: C) {
  // the raw unproxied value beneath the proxy
  let descriptor = getProxyDescriptor(draft);

  const { path } = config;

  if (path.length > 0) {
    ({ descriptor } = prepareMergeAtPath(descriptor, path, target));
  }

  if (!descriptor) {
    // descriptor will be undefined if we do not need to conduct any further
    // merge (which will happen if we added new keys during a .at call).
    return;
  }

  if (typeof target !== 'object') {
    // when target is not an object, we set the descriptor to the given value
    // directly;
    return setDescriptorsValue(descriptor, target);
  }

  handleMergeIntoDescriptor(descriptor, target, config);

  pathResult.descriptor = undefined;
  pathResult.path = undefined;
}
