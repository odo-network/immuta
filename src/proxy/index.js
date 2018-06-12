/* @flow  */

import type { ProxyDescriptor, ProxyDescriptor$Root, ProxyDescriptor$Child } from '../types';
import { PROXY_SYMBOL, MODULE_NAME, OBJ_DESCRIPTORS } from '../utils/context';
import SetMap from '../setmap';

import * as handle from './handlers';
import * as utils from '../utils';

const staticObjs = {
  path: Object.freeze([]),
  modified: new WeakSet(),
  revokes: new Set(),
  changed: new Map(),
  children: new Map(),
  changedBy: new SetMap(),
};

const rootDescriptor = {
  isRoot: true,
  revoked: false,
  base: undefined,
  get parent() {
    return this;
  },
  get root() {
    return this;
  },
  get proxy() {
    this._proxy = this._proxy || createProxy(this);
    return this._proxy;
  },
  get path() {
    return staticObjs.path;
  },
  get modified() {
    return staticObjs.modified;
  },
  get revokes() {
    return staticObjs.revokes;
  },
  get changed() {
    return staticObjs.changed;
  },
  get children() {
    return staticObjs.children;
  },
  get changedBy() {
    return staticObjs.changedBy;
  },
};

/**
 * @description
 * @author Braden Napier
 * @date 2018-06-07
 * @export
 * @template S
 * @template Object
 * @param {S} base
 * @returns {ProxyDescriptor$Root<S>}
 */
export default function deepProxy<+S>(base: S): ProxyDescriptor$Root<S> {
  return base[PROXY_SYMBOL] || createRootDescriptor(base);
}

const traps = {
  get,
  set,
  has,
  apply,
  ownKeys,
  construct,
  isExtensible,
  defineProperty,
  deleteProperty,
  setPrototypeOf,
  getPrototypeOf,
  preventExtensions,
  getOwnPropertyDescriptor,
};

export function createProxy<+S>(descriptor: ProxyDescriptor<S>): S {
  const p = Proxy.revocable(descriptor, traps);

  if (typeof descriptor === 'object') {
    descriptor.root.revokes.add(p.revoke);
  }

  return p.proxy;
}

export const createRootDescriptor = <+S>(base: S): ProxyDescriptor$Root<S> => {
  delete rootDescriptor._proxy;
  rootDescriptor.base = base;
  rootDescriptor.revoked = false;
  return rootDescriptor;
};

export const createChildDescriptor = <+S>(
  base: S,
  key: string,
  parent: ProxyDescriptor<*>,
  setParent?: boolean = true,
): ProxyDescriptor$Child<S> => {
  let proxy;
  let children;

  const path = parent.path.concat(key);

  const isPotentialParent = typeof base === 'function' || typeof base === 'object';

  const descriptor: ProxyDescriptor$Child<S> = {
    isPotentialParent,
    path,
    base,

    get children() {
      if (!isPotentialParent) return;
      children = children || new Map();
      return children;
    },
    get parent() {
      return parent;
    },
    get root() {
      return parent.root;
    },
    get proxy() {
      if (!isPotentialParent) return utils.getValue(this);
      if (!proxy) {
        if (typeof base === 'function') {
          proxy = createProxy(base);
        } else {
          proxy = createProxy(this);
        }
      }
      return proxy;
    },
  };

  if (setParent) {
    parent.children.set(key, descriptor);
  }

  return descriptor;
};

const paths = Object.create(null);

export function getPaths<+S>(descriptor: ProxyDescriptor<S>, key: string) {
  const d = descriptor.children.get(key);
  if (d) {
    paths.current = d.path;
  } else {
    throw new Error(`[${MODULE_NAME}] | ERROR | Invalid Path Request for "${key}" at path [${descriptor.path.join(', ')}]`);
  }
  paths.parent = descriptor.path;
  return paths;
}

function get<S>(_descriptor: ProxyDescriptor<S>, key: any) {
  const descriptor = _descriptor;
  if (key === PROXY_SYMBOL) {
    return typeof descriptor === 'function' ? OBJ_DESCRIPTORS.get(descriptor) : descriptor;
    // $FlowIgnore
  } else if (typeof key === 'symbol') {
    if (utils.isCustomInspect(key)) {
      return () => OBJ_DESCRIPTORS.get(descriptor) || utils.getValue(descriptor);
    }
  }

  const value = utils.getValue(descriptor);
  let response = Reflect.get(value, key);

  switch (key) {
    case 'constructor': {
      return response;
    }
    default:
    // Move on
  }

  const isType = typeof response;

  let childDescriptor;

  switch (isType) {
    case 'function': {
      if (!OBJ_DESCRIPTORS.has(response)) {
        childDescriptor = createChildDescriptor(response, key, descriptor, false);
        OBJ_DESCRIPTORS.set(childDescriptor.base, childDescriptor);
      } else {
        childDescriptor = OBJ_DESCRIPTORS.get(response);
      }
      response = childDescriptor.proxy;
      break;
    }
    case 'object': {
      // When we receive an object response, we need to return the proxy rather
      // than the object itself.
      childDescriptor = descriptor.children.get(key);
      if (!childDescriptor) {
        childDescriptor = createChildDescriptor(response, key, descriptor);
      }
      response = childDescriptor.proxy;
      break;
    }
    default: {
      // When the value is not proxyable, return it directly, no changes needed
    }
  }

  return response;
}

function set<+S>(descriptor: ProxyDescriptor<S>, key: any, value: any) {
  if (utils.getValue(descriptor, key) === value) {
    return true;
  }
  handle.change(descriptor, key, value);
  return true;
}

function has<+S>(descriptor: ProxyDescriptor<S>, key: any) {
  return Reflect.has(utils.getValue(descriptor), key);
}

function apply<F: Function>(fn: F, context: any, args: any[], proxy) {
  // console.log('--> Apply: ', fn.name, context);
  const descriptor = OBJ_DESCRIPTORS.get(fn);

  if (!descriptor) {
    throw new Error(`[${MODULE_NAME}] | ERROR | Unknown Function?`);
  }

  const { parent } = descriptor;

  const hasCopy = utils.hasProperty(parent, 'copy');
  let owner = utils.getValue(parent);

  let willChange = false;
  // used when we need to copy response objects in some circumstances
  let copyResponse = false;

  switch (fn.name) {
    case 'has':
    case 'keys': {
      // since the keys or values may be objects we need to
      // be sure all values that are returned are properly
      // proxied.  This will likely be expensive for any
      // operations on Maps or Sets with a significant
      // number of entries
      return Reflect.apply(fn, owner, args);
    }
    case 'values': {
      // since we must pair with keys, we have to process as entries() and feed it values()
      // therefore this request is not performant
      const m = new Map();
      for (const [k, _v] of owner.entries()) {
        let v = _v;
        if (typeof v === 'object') {
          const childDescriptor = parent.children.get(k) || createChildDescriptor(v, k, parent);
          v = childDescriptor.proxy;
        }
        m.set(k, v);
      }
      return m.values();
    }
    case 'entries': {
      // since we must pair with keys, we have to process as entries() and feed it values()
      // therefore this request is not performant
      const m = new Map();
      for (const [k, _v] of owner.entries()) {
        let v = _v;
        if (typeof v === 'object') {
          const childDescriptor = parent.children.get(k) || createChildDescriptor(v, k, parent);
          v = childDescriptor.proxy;
        }
        m.set(k, v);
      }
      return m.entries();
    }
    case 'get': {
      let v = owner.get(args[0]);
      if (typeof v === 'object') {
        // we need to return a proxy object instead
        // of the normal object while maintaining the
        // nesting for the Map or Set
        const childDescriptor = parent.children.get(args[0]) || createChildDescriptor(v, args[0], parent);
        v = childDescriptor.proxy;
        // console.log('Proxy Return: ', value, parent.path, parent.children);
      }
      return v;
    }
    case 'forEach': {
      const [next] = args;
      // we need to wrap the forEach call and provide proxies
      // for any values which may be mutated.  We do not allow
      // or consider mutation of values at this time.
      return owner.forEach((_v, k) => {
        // when array - k is index
        let v = _v;
        if (typeof v === 'object') {
          const childDescriptor = parent.children.get(k) || createChildDescriptor(v, k, parent);
          v = childDescriptor.proxy;
        }
        return next(v, k);
      });
    }
    case 'add': {
      if (owner.has(args[0])) {
        return proxy;
      }
      willChange = true;
      break;
    }
    case 'set': {
      const current = owner.get(args[0]);
      if (current === args[1]) {
        // ? User must be careful here as setting an object on the map
        // ? is potentially not going to be detected
        return current;
      }
      willChange = true;
      break;
    }
    case 'clear': {
      if (owner.size !== 0) {
        // current owner will change to an instance without any values.
        if (parent.base.size === 0) {
          // we are back to the original value of the Map or Set
          handle.revert(parent, parent.path[parent.path.length - 1]);
          return;
        }
        willChange = true;
      } else {
        return;
      }
      break;
    }
    case 'delete': {
      if (!owner.has(args[0])) {
        return;
      }
      willChange = true;
      break;
    }
    case 'pop':
    case 'shift': {
      if (owner.length === 0) {
        return;
      }
      willChange = true;
      copyResponse = true;
      break;
    }
    case 'push': {
      willChange = true;
      break;
    }
    case Symbol.iterator: {
      // TODO - Handle Iteration
      break;
    }
    default: {
      // When we don't specifically handle a function name, we must clone the
      // value and run against that, assuming a change occurred
      willChange = true;
      break;
    }
  }

  if (willChange && !hasCopy) {
    parent.copy = utils.shallowCopy(owner);
    owner = parent.copy;
  }

  const response = Reflect.apply(fn, owner, args);

  if (willChange) {
    handle.change(parent.parent, parent.path[parent.path.length - 1], owner);
  }

  if (copyResponse && typeof response === 'object') {
    return utils.shallowCopy(response);
  }

  return response;
}

function ownKeys<+S>(descriptor: ProxyDescriptor<S>) {
  return Reflect.ownKeys(utils.getValue(descriptor));
}

function deleteProperty<+S>(descriptor: ProxyDescriptor<S>, key: any) {
  const value = utils.getValue(descriptor);

  if (utils.hasProperty(value, key)) {
    handle.change(descriptor, key, undefined, true);
  }

  return true;
}

function defineProperty() {
  // console.log('Define Property');
  throw new Error(`[${MODULE_NAME}] | ERROR | defineProperty | It is an error to define properties on draft objects`);
}

function setPrototypeOf() {
  throw new Error(`[${MODULE_NAME}] | ERROR | defineProperty | It is an error to set the prototype of draft objects`);
}

function getPrototypeOf<+S: Object>(descriptor: ProxyDescriptor<S>) {
  return Reflect.getPrototypeOf(utils.getValue(descriptor));
}

function getOwnPropertyDescriptor<+S>(descriptor: ProxyDescriptor<S>, key: any) {
  const propDescriptor = Reflect.getOwnPropertyDescriptor(utils.getValue(descriptor), key);
  propDescriptor.configurable = true;
  return propDescriptor;
}

function construct<+S>(desccriptor: ProxyDescriptor<S>, args: any[]) {
  return Reflect.construct(utils.getValue(descriptor), args);
}

function preventExtensions() {
  return true;
}

function isExtensible<+S>(descriptor: ProxyDescriptor<S>) {
  return true;
}
