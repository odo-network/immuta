/* @flow */

import type { ProxyDescriptor, ProxyDescriptor$Child, ProxyDescriptor$Root } from '../types';

import SetMap from '../setmap';

const rootDescriptor = { path: [] };

export const getRootDescriptor = <S: Object>(base: S): ProxyDescriptor$Root<S> => ({
  base,
  get parent() {
    return this;
  },
  get root() {
    return this;
  },
  isRoot: true,
  path: rootDescriptor.path,
  changed: new Map(),
  modified: new WeakSet(),
  changedBy: new SetMap(),
  revokes: new Set(),
  children: {},
});

export const getChildDescriptor = <S: Object>(
  base: S,
  _key: string,
  parent: ProxyDescriptor<S>,
): ProxyDescriptor$Child<S> => {
  let key = _key;
  let path;
  if (base instanceof Map) {
    key = `${key}(=> [MAP])`;
  } else if (base instanceof Set) {
    key = `${key}(=> [SET])`;
  } else if (typeof parent.base === 'function') {
    key = `(${key})`;
  }
  // } else if (typeof parent.base === 'function') {
  //   const parentKey = parent.path.pop();
  //   parent.path.push(`${parentKey}(${key})`);
  //   path = parent.path;
  //   return parent;
  // }
  return {
    base,
    parent,
    root: parent.root,
    path: path || parent.path.concat(key),
    children: {},
  };
};

const paths = Object.create(null);

export function getPaths<+S: Object>(descriptor: ProxyDescriptor<S>, key: string) {
  // console.log('Get Paths for Key: ', key);
  paths.parent = descriptor.path.length ? descriptor.path.join('.') : '';
  paths.current = `${paths.parent ? `${paths.parent}.` : paths.parent}${key}`;
  return paths;
}

export function shallowCopy<O: Object>(obj: O): O | Map<any, any> | Set<any> {
  if (obj instanceof Map) {
    return new Map(obj);
  } else if (obj instanceof Set) {
    return new Set(obj);
  } else if (Array.isArray(obj)) {
    return obj.slice();
  }
  return Object.assign(Object.getPrototypeOf(obj) ? {} : Object.create(null), obj);
}

export function hasProperty(obj: Object, prop: any): boolean {
  return Object.hasOwnProperty.call(obj, prop);
}

export function revokeProxies<S: Object>(descriptor: ProxyDescriptor<S>) {
  if (descriptor.root.revokes.size) {
    descriptor.root.revokes.forEach(revoke => revoke());
  }
}
