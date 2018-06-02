/* @flow  */

import type { ProxyDescriptor, ProxyDescriptor$Root } from './types';
import { PROXY_SYMBOL, MODULE_NAME } from './context';

import * as utils from './utils';
import * as handle from './handlers';

/**
 * Creates a Proxy which will record it's updates and handle the changing
 * of Object references as values change in nested Objects.
 *
 * @export
 * @template B
 * @template Object
 * @param {Object} base
 * @returns {Proxy<ProxyDescriptor$Root>}
 */
export default function deepProxy<S: Object>(base: S): [Proxy<S>, ProxyDescriptor$Root<S>] {
  if (base[PROXY_SYMBOL]) return [base, base[PROXY_SYMBOL]];

  if (typeof base !== 'object') {
    throw new Error(`[${MODULE_NAME}] | ERROR | deepProxy | Expected an Object`);
  }

  const descriptor = utils.getRootDescriptor(base);

  // Hacky way to make Flow return the appropriate Proxy Object.
  // $FlowIgnore
  return [(createProxy(descriptor, base): Proxy<S>), descriptor];
}

function createProxy<S: Object>(descriptor: ProxyDescriptor<S>) {
  const { proxy, revoke } = Proxy.revocable(descriptor, {
    get: proxiedGet,
    set: proxiedSet,
    has: proxiedHas,
    apply: proxiedApply,
    ownKeys: proxiedOwnKeys,
    defineProperty: proxiedDefineProperty,
    deleteProperty: proxiedDeleteProperty,
    setPrototypeOf: proxiedSetPrototypeOf,
    getPrototypeOf: proxiedGetPrototypeOf,
    // getOwnPropertyDescriptor: proxiedGetOwnPropertyDescriptor,
  });
  descriptor && descriptor.root && descriptor.root.revokes.add(revoke);
  return proxy;
}

function proxiedGet<S: Object>(descriptor: ProxyDescriptor<S>, key: any) {
  if (key === PROXY_SYMBOL) return descriptor[PROXY_SYMBOL] || descriptor;

  let obj;

  if (descriptor.copy && descriptor.copy[PROXY_SYMBOL]) {
    obj = descriptor.copy[PROXY_SYMBOL].copy;
  } else if (descriptor.copy) {
    obj = descriptor.copy;
  } else {
    obj = descriptor.base;
  }

  let response = Reflect.get(obj, key);

  if (typeof response === 'object') {
    // Do we already have a proxy for this object?
    const childDescriptor = descriptor.children[key] || utils.getChildDescriptor(response, key, descriptor);
    descriptor.children[key] = childDescriptor;
    response = createProxy(childDescriptor);
  } else if (
    typeof response === 'function' &&
    (descriptor.base instanceof Map || descriptor.base instanceof Set)
  ) {
    const childDescriptor = descriptor.children[key] || utils.getChildDescriptor(response, key, descriptor);
    descriptor.children[key] = childDescriptor;

    // TODO : A better way outside of mutating the function with a symbol? WeakMap?
    childDescriptor.base[PROXY_SYMBOL] = childDescriptor;

    response = createProxy(childDescriptor.base);
  }

  return response;
}

function proxiedSet<S: Object>(descriptor: ProxyDescriptor<S>, key: any, value: any) {
  // just ignore this silly request!
  if (key === PROXY_SYMBOL) return true;

  console.log('Set! ', key, value);

  const current = Reflect.get(descriptor.copy || descriptor.base, key);

  if (current === value) {
    // no change, do nothing
    return true;
  }

  handle.change(descriptor, key, value);

  return true;
}

function proxiedHas<S: Object>(descriptor: ProxyDescriptor<S>, key: any) {
  return Reflect.has(descriptor.copy || descriptor.base, key);
}

function proxiedApply<S: Object>(fn: Function & ProxyDescriptor<S>, context: any, args: any[]) {
  const descriptor = fn[PROXY_SYMBOL];
  const { parent } = descriptor;

  console.log('Apply! ', fn, context, args);

  const owner = parent.copy || parent.base;

  /*
    * Handling ES6 Map or Set requires us to
    * capture attempted function calls and
    * handle.
    *
  */
  if (owner instanceof Map || owner instanceof Set) {
    // handling Set's and Map's makes for a challenge as we need
    // to not only call the methods while maintaining context, but
    // we also need to be sure that we end up returning a new proxy
    // if the response is an object for handling of nested values.
    if (!parent.copy) {
      parent.copy = owner instanceof Map ? new Map(parent.base) : new Set(parent.base);
    }

    const method = descriptor.path[descriptor.path.length - 1];

    switch (method) {
      case 'has': {
        // non-mutating and non-proxyable response
        return Reflect.apply(fn, parent.copy, args);
      }
      case 'entries':
      case 'keys':
      case 'values': {
        // since the keys or values may be objects we need to
        // be sure all values that are returned are properly
        // proxied.  This will likely be expensive for any
        // operations on Maps or Sets with a significant
        // number of entries
        break;
      }
      case 'get': {
        const value = owner.get(args[0]);
        if (typeof value === 'object') {
          // we need to return a proxy object instead
          // of the normal object while maintaining the
          // nesting for the Map or Set
        }
        return value;
      }
      case 'clear': {
        if (owner.size !== 0) {
          // current owner will change to an instance without any values.
          if (parent.base.size === 0) {
            // we are back to the original value of the Map or Set
            // TODO : How to feed to revert / change for Map/Set
            // handle.revert()
          } else {
            // we are mutating the parent Map/Set for the descriptor
            // handle.change()
          }
        }
        return;
      }
      case 'delete': {
        break;
      }
      case 'add': {
        if (owner.has(args[0])) {
          return fn;
        }
        return fn;
      }
      case 'set': {
        // we need to see if the set will cause a mutation
        const current = owner.get(args[0]);
        if (current === args[1]) {
          // ? User must be careful here as setting an object on the map
          // ? is potentially not going to be detected
          return fn;
        }
        break;
      }
      case 'forEach': {
        // we need to wrap the forEach call and provide proxies
        // for any values which may be mutated
        break;
      }
      case Symbol.iterator: {
        break;
      }
      default: {
        throw new Error(`[${MODULE_NAME}] | ERROR | apply on Set or Map | The Set or Map method ${method} is not currently supported`);
      }
    }

    const response = Reflect.apply(fn, parent.copy, args);
    handle.change(parent.parent, parent.path[parent.path.length - 1], parent.copy);

    return response;
  }
  return Reflect.apply(fn, context, args);
}

function proxiedOwnKeys<S: Object>(descriptor: ProxyDescriptor<S>) {
  return Reflect.ownKeys(descriptor.copy || descriptor.base);
}

function proxiedDeleteProperty<S: Object>(descriptor: ProxyDescriptor<S>, key: any) {
  if (
    (descriptor.copy && utils.hasProperty(descriptor.copy, key)) ||
    (!descriptor.copy && utils.hasProperty(descriptor.base, key))
  ) {
    // value is removing a property that currently exists
    handle.change(descriptor, key, undefined, true);
  }
  return true;
}

// function proxiedGetOwnPropertyDescriptor<S: Object>(descriptor: ProxyDescriptor<S>, key) {
//   return Reflect.getOwnPropertyDescriptor(descriptor, key);
// }

export function proxiedDefineProperty() {
  throw new Error(`[${MODULE_NAME}] | ERROR | defineProperty | It is an error to define properties on draft objects`);
}

export function proxiedSetPrototypeOf() {
  throw new Error(`[${MODULE_NAME}] | ERROR | defineProperty | It is an error to set the prototype of draft objects`);
}

export function proxiedGetPrototypeOf<S: Object>(descriptor: ProxyDescriptor<S>) {
  // console.log('Proxy Get Proto: ', descriptor);
  return Reflect.getPrototypeOf(descriptor.copy || descriptor.base);
}
