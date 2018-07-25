/* @flow */

import type { PossibleValueTypes, ProxyDescriptor } from '../types';
// import { createChildDescriptor } from '../proxy';
import { PROXY_SYMBOL, MODULE_NAME } from './context';
import { change } from '../proxy/handlers';

import WeakMapProxy from './WeakMapProxy';

export function isType<V>(value: V): PossibleValueTypes {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  const type = typeof value;
  switch (type) {
    case 'object': {
      if (Array.isArray(value)) {
        return 'array';
      }
      if (value instanceof Map || value instanceof WeakMap) {
        return 'map';
      }
      if (value instanceof Set) {
        return 'set';
      }
      if (value instanceof RegExp) {
        return 'regexp';
      }
      if (value instanceof Date) {
        return 'date';
      }
      return 'object';
    }
    case 'number': {
      if (Number.isNaN(value)) {
        return 'nan';
      }
      return 'number';
    }
    case 'symbol':
    case 'function':
    case 'boolean':
    case 'string':
    case 'undefined':
      return type;
    default: {
      console.warn('[IMMUTA]: UNKNOWN TYPE: ', value, type);
      return 'unknown';
    }
  }
}

export function shallowCopy<O: Object>(obj: O): $Shape<O> {
  if (typeof obj !== 'object' || !obj) {
    return obj;
  }

  if (obj instanceof Map) {
    return new Map(obj);
  }
  if (obj instanceof WeakMap) {
    // we cant access the keys of the object so a clone
    // can only be a brand new weak map
    return new WeakMapProxy(obj);
  }
  if (obj instanceof Set) {
    return new Set(obj);
  }
  if (Array.isArray(obj)) {
    return obj.slice();
  }

  const proto = Object.getPrototypeOf(obj);

  const newobj = proto ? {} : Object.create(null);

  return Object.assign(newobj, obj);
}

export function getValue<+S, +K>(descriptor: ProxyDescriptor<S>, key?: K) {
  if (typeof descriptor === 'function') {
    return descriptor;
  }

  let base;
  if ('copy' in descriptor) {
    base = descriptor.copy;
  } else {
    ({ base } = descriptor);
  }

  if (key) {
    return Reflect.get(base, key);
  }

  return base;
}

export function getProxyDescriptor<+P: Object>(proxy: P): void | ProxyDescriptor<*> {
  return proxy[PROXY_SYMBOL];
}

export function getKeyOfDescriptor<+S>(descriptor: ProxyDescriptor<S>): string {
  if (descriptor.isRoot) {
    throw new Error(
      `[ERROR] | ${MODULE_NAME} | getKeyOfDescriptor | Attempted to get the key of the root descriptor`,
    );
  }
  return descriptor.path[descriptor.path.length - 1];
}

export function getParentOfDescriptor<+S>(descriptor: ProxyDescriptor<S>): ProxyDescriptor<*> {
  if (descriptor.isRoot) {
    throw new Error(
      `[ERROR] | ${MODULE_NAME} | getParentOfDescriptor | Attempted to get the parent of the root descriptor`,
    );
  }
  return descriptor.parent;
}

export function getProxiedValue<+P: Object>(proxy: P) {
  const descriptor = getProxyDescriptor(proxy);
  if (!descriptor) {
    throw new TypeError(
      `[ERROR] | ${MODULE_NAME} | getProxiedValue | Provided value does not appear to be an immuta proxy.`,
    );
  }
  return getValue(descriptor);
}

export function getChildProxy<+S, +K>(descriptor: ProxyDescriptor<S>, key: K) {
  const { type, proxy } = descriptor;
  if (!proxy) {
    console.warn('No Proxy in Descriptor?');
    return null;
  }
  switch (type) {
    case 'map': {
      // $FlowIgnore
      return proxy.get(key);
    }
    case 'set': {
      const source = getValue(descriptor);
      if (source.has(key)) {
        console.log('has but what next?');
      }
      break;
    }
    case 'array':
    case 'object': {
      // $FlowIgnore
      return proxy[key];
    }
    default: {
      return null;
    }
  }
}

export function cleanChildren<+S: Object>(descriptor: void | ProxyDescriptor<S>) {
  if (!descriptor || !descriptor.children) return;
  descriptor.children.forEach((child, childKey) => {
    const { children } = child;
    if (children && children.size) {
      cleanChildren(child);
    }
    child.root.changed.delete(child.path);
    child.root.changedBy.removeSet(descriptor.path, child.path);
    descriptor.children.delete(childKey);
  });
}

export function is<+O: Object, K, V>(obj: O, key: K, value2: V): boolean {
  let value;
  if (obj instanceof Map || obj instanceof WeakMap) {
    value = obj.get(key);
  } else if (obj instanceof Set) {
    if (obj.has(key) && key === value2) {
      return true;
    }
    return false;
  } else if (typeof obj === 'object') {
    value = obj[key];
  }
  return Object.is(value, value2);
}

export function hasProperty<+O: Object, K>(obj: O, prop: K): boolean {
  if (typeof obj !== 'object') return false;
  if (obj instanceof Map || obj instanceof Set || obj instanceof WeakMap) return obj.has(prop);
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function isCustomInspect<K>(key: K) {
  return Object.is(String(Symbol.prototype.valueOf.call(key)), 'Symbol(util.inspect.custom)');
}

export function revokeProxies<+S>(descriptor: ProxyDescriptor<S>): void {
  if (descriptor.root.revokes.size) {
    descriptor.root.revokes.forEach(revoke => revoke());
  }
  descriptor.root.revoked = true;
  descriptor.root.revokes.clear();
}

/**
 * sets the value of the given descriptor by first capturing
 * its parent and its current key and providing it to the
 * standard proxy handler.
 * @param {*} descriptor
 * @param {*} value
 */
export function setDescriptorsValue<+S>(descriptor: ProxyDescriptor<S>, value: S) {
  const parent = getParentOfDescriptor(descriptor);
  const key = getKeyOfDescriptor(descriptor);
  return setDescriptorChild(parent, key, value);
}

export function setDescriptorChild<+S, K>(descriptor: ProxyDescriptor<S>, key: K, value: S) {
  if (descriptor.children.has(key)) {
    // clean the children
    cleanChildren(descriptor.children.get(key));
  }
  return change(descriptor, key, value);
}
