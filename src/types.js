/* @flow */
import type SetMap from './setmap';

export type PossibleValueTypes =
  | 'undefined'
  | 'null'
  | 'array'
  | 'map'
  | 'set'
  | 'regexp'
  | 'object'
  | 'date'
  | 'number'
  | 'nan'
  | 'symbol'
  | 'function'
  | 'boolean'
  | 'string'
  | 'unknown';

/**
 * Dynamically created and holds all important proxy properties.  It is technically
 * the value that is returned and the base of the proxy.
 */
export type ProxyDescriptor$Root<S> = {|
  +isRoot: true,

  root: ProxyDescriptor$Root<S>,
  +parent: ProxyDescriptor$Root<S>,

  +path: string[],
  // The base unchanged object that is received
  +base: S,
  // When a write is performed, the copy will hold a copy of base
  copy?: S,

  proxy: S,
  // indicates whether the proxy tree has been revoked or not
  revoked: boolean,

  +children: Map<any, ProxyDescriptor<*>>,

  +path: string[],
  +revokes: Set<() => void>,
  +changed: Map<string[], Object>,
  +changedBy: SetMap<string[], string[]>,
  +modified: WeakSet<ProxyDescriptor<*>>,
  +type: 'object',
|};

export type ProxyDescriptor$Child<S> = {|
  +isPotentialParent: boolean,
  +path: string[],
  // The base unchanged object that is received
  +base: S,
  // When a write is performed, the copy will hold a copy of base
  copy?: S,

  proxy?: S,

  +children: Map<any, ProxyDescriptor<*>>,
  +root: ProxyDescriptor$Root<*>,
  +isRoot: false,
  +type: PossibleValueTypes,
  +parent: ProxyDescriptor<*>,
|};

// Any kind of ProxyDescriptor
export type ProxyDescriptor<S> = ProxyDescriptor$Root<S> | ProxyDescriptor$Child<S>;

export type MergerDescriptor = [Class<Map<*, *>> | Class<Set<*>>, mixed];

export type MergerPath = Array<MergerDescriptor | any>;

export type MergerConfig = {|
  path: MergerPath,
  deep: boolean,
|};
