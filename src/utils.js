/* @flow */

import type { ProxyDescriptor, ProxyDescriptor$Child, ProxyDescriptor$Root } from './types';

import SetMap from './setmap';

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
  key: string,
  parent: ProxyDescriptor<S>,
): ProxyDescriptor$Child<S> => ({
    base,
    parent,
    root: parent.root,
    path: parent.path.concat(key),
    children: {},
  });

const paths = Object.create(null);

export function getPaths<+S: Object>(descriptor: ProxyDescriptor<S>, key: string) {
  paths.parent = descriptor.path.length ? descriptor.path.join('.') : '';
  paths.current = `${paths.parent ? `${paths.parent}.` : paths.parent}${key}`;
  return paths;
}

export function shallowCopy<O: Object>(obj: O): O | Map<any, any> | Set<any> {
  if (obj instanceof Map) {
    return new Map([...obj]);
  } else if (obj instanceof Set) {
    return new Set([...obj]);
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
