/* @flow */
import type SetMap from './setmap';

type ProxyDescriptor$Common<S> = {|
  +path: string[],
  // The base unchanged object that is received
  +base: S,
  // When a write is performed, the copy will hold a copy of base
  copy?: $Shape<S>,
  +children: { [key: string]: ProxyDescriptor$Child<*> },
|};

/**
 * Dynamically created and holds all important proxy properties.  It is technically
 * the value that is returned and the base of the proxy.
 */
export type ProxyDescriptor$Root<S> = {|
  ...ProxyDescriptor$Common<S>,
  get root(): ProxyDescriptor$Root<S>,
  get parent(): ProxyDescriptor$Root<S>,
  +isRoot: true,
  +path: [],
  +revokes: Set<() => void>,
  +changed: Map<string, Object>,
  +changedBy: SetMap<string, string>,
  +modified: WeakSet<ProxyDescriptor<*>>,
|};

export type ProxyDescriptor$Child<S> = {|
  ...ProxyDescriptor$Common<S>,
  +root: ProxyDescriptor$Root<*>,
  +isRoot?: void | false,
  +parent: ProxyDescriptor<*>,
|};

// Any kind of ProxyDescriptor
export type ProxyDescriptor<S> = ProxyDescriptor$Root<S> | ProxyDescriptor$Child<S>;
