/* @flow */
// import type { ProxyDescriptor$Root } from './types';

import { revokeProxies, getValue, hasProperty } from './utils';

import { MODULE_NAME, PROXY_SYMBOL, OBJ_DESCRIPTORS } from './utils/context';

import deepProxy from './proxy';

import * as handle from './proxy/handlers';

type ImmutaConfig = {|
  freeze: boolean,
  base: void | Object,
|};

export const config: ImmutaConfig = {
  freeze: true,
};
/*
  We need to do reference counting to allow for nesting immuta properties deeply.  These are used to delay revokes until
  the outer-most "immuta" reaches the end of its handling.
*/
let immutaRef = 0;

const rollback: boolean[] = [];

export function setImmutaConfig<K: $Keys<ImmutaConfig>>(key: K, value: $ElementType<ImmutaConfig, K>) {
  if (!Object.keys(config).includes(key)) {
    throw new TypeError(
      `[${MODULE_NAME}] | ERROR | setConfig | key ${key} is not a known config value: ${Object.keys(config).join(
        ', ',
      )}`,
    );
  }
  config[key] = value;
}

function maybeFreeze<+O>(obj: O): O {
  if (config.freeze && !Object.isFrozen(obj)) {
    return Object.freeze(obj);
  }
  return obj;
}

// Captures the
function unwindProxyIfNeeded<+O>(obj: O): O {
  let descriptor;
  if (typeof obj === 'function') {
    descriptor = OBJ_DESCRIPTORS.get(obj);
  } else {
    descriptor = obj[PROXY_SYMBOL];
  }
  if (descriptor) {
    const val = getValue(descriptor);

    if (typeof val === 'function') {
      return val;
    }

    const next = typeof val === 'object' ? unwindProxyIfNeeded(val) : val;

    if (descriptor.base === next) {
      handle.revert(descriptor.parent, descriptor.path[descriptor.path.length - 1]);
    }
    return next;
  }

  return obj;
}

function cleanAndFreezeObjectDeeply<+O>(_obj: O): O {
  if (!_obj || typeof _obj !== 'object') return _obj;
  const obj = unwindProxyIfNeeded(_obj);
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return maybeFreeze(
      obj.reduce((p, c, i) => {
        if (c && typeof c === 'object') {
          p[i] = cleanAndFreezeObjectDeeply(p[i]);
        }
        return p;
      }, obj),
    );
  }
  if (obj instanceof Set || obj instanceof Map) {
    return maybeFreeze(
      Array.from(obj).reduce((p, c) => {
        if (obj instanceof Map) {
          // map -- we do not currently watch keys of map
          p.set(c[0], cleanAndFreezeObjectDeeply(c[1]));
        } else if (typeof c === 'object') {
          // problem here is that sets ordering will be broken
          // on objects.
          const cleaned = cleanAndFreezeObjectDeeply(c);
          if (cleaned !== c) {
            p.delete(c);
          }
          p.add(cleaned);
        }
        return p;
      }, obj),
    );
  }
  if (Object.isFrozen(obj)) {
    // if this object hasnt changed and is frozen, we can return it directly
    return obj;
  }
  return maybeFreeze(
    Object.keys(obj).reduce((p, c) => {
      const current = p[c];
      if (current && typeof current === 'object') {
        p[c] = cleanAndFreezeObjectDeeply(current);
      }
      return p;
    }, obj),
  );
}

function validateArguments(base, handleMutateState, handleStateChange) {
  if (base == null || typeof base !== 'object') {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | base argument must be an object`);
  } else if (typeof handleMutateState !== 'function') {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | handleMutateState must be a function`);
  } else if (handleStateChange && typeof handleStateChange !== 'function') {
    throw new Error(
      `[${MODULE_NAME}] | ERROR | changeState | When defined, handleStateChangeEvent [3] must be a function`,
    );
  }
}

function doRollback(shouldRollback: boolean = true) {
  rollback[immutaRef] = Boolean(shouldRollback);
}

export default function changeState<+S: Object>(
  base: S,
  handleMutateState: (draft: S) => any,
  handleStateChange?: (state: { ...S }, changedValues: Map<any, Object>, rollback: () => void) => mixed,
): $Shape<S> {
  validateArguments(base, handleMutateState, handleStateChange);

  rollback[immutaRef] = false;

  immutaRef += 1;

  let next = base;

  const descriptor = deepProxy(base);

  handleMutateState(descriptor.proxy);

  immutaRef -= 1;

  if (immutaRef === 0) {
    const hasCopy = hasProperty(descriptor, 'copy');
    if (!hasCopy && Object.isFrozen(descriptor.base)) {
      // no changes to object and object is frozen,
      // return the same object
      next = descriptor.base;
    } else if (!hasCopy && config.freeze) {
      // provided object not frozen, configuration says to freeze -
      // return the same object as given, but freeze it deeply.
      next = descriptor.base;
    } else if (hasCopy) {
      // values within our object have been modified, iterate
      // and freeze/clean the object of any proxies.
      next = cleanAndFreezeObjectDeeply(descriptor.copy);
    }
  }

  if (handleStateChange && descriptor.root.changed.size > 0) {
    // we need to clone the changed map just in case values expected outside of
    // this context.
    handleStateChange(next, new Map(descriptor.root.changed), doRollback);
    if (rollback.pop()) {
      next = descriptor.base;
    }
  } else {
    rollback.pop();
  }

  if (immutaRef === 0) {
    // once done nesting, revoke proxies so that they are not accidentally used
    // elsewhere within the application (by sending them with promises, etc)
    revokeProxies(descriptor);
    descriptor.root.base = undefined;
    descriptor.root._proxy = undefined;
    descriptor.root.changed.clear();
    descriptor.root.children.clear();
    descriptor.root.changedBy.clear();
    OBJ_DESCRIPTORS.clear();
    delete descriptor.root.copy;
  }

  return next;
}
