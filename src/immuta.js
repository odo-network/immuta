/* @flow */
import type { ProxyDescriptor$Root } from './types';

import { MODULE_NAME, PROXY_SYMBOL } from './context';
import deepProxy from './proxy';

import { revokeProxies } from './utils';
import * as handle from './handlers';

type Handle$MutateState<S: Object> = (draft: $Shape<S>) => void | $Shape<S>;

type Handle$Rollback = () => void;

type Handle$StateChange<S: Object> = (
  state: $Shape<S>,
  changedValues: Map<any, Object>,
  rollback: Handle$Rollback,
) => mixed;

type ImmutaResults<S: Object> = {|
  descriptor: ProxyDescriptor$Root<S>,
  proxy: Proxy<S>,
  response: void | $Shape<S>,
  rollback: boolean,
|};

type ImmutaConfig = {|
  freeze: boolean,
|};

const config: ImmutaConfig = {
  freeze: false,
};

export function setImmutaConfig<K: $Keys<ImmutaConfig>>(key: K, value: $ElementType<ImmutaConfig, K>) {
  if (!Object.keys(config).includes(key)) {
    throw new TypeError(`[${MODULE_NAME}] | ERROR | setConfig | key ${key} is not a known config value: ${Object.keys(config).join(', ')}`);
  }
  config[key] = value;
}

function maybeFreeze<O: Object>(obj: O): O {
  if (config.freeze) {
    return Object.freeze(obj);
  }
  return obj;
}

/*
  We need to do reference counting to allow for nesting immuta properties deeply.  These are used to delay revokes until
  the outer-most "immuta" reaches the end of its handling.
*/
let immutaRef = 0;

function startStateMutation<S: Object>(base: S, handleMutateState: Handle$MutateState<S>): ImmutaResults<S> {
  const [proxy, descriptor] = deepProxy(base);
  return {
    descriptor,
    proxy,
    // Another hacky trick to make Flow feed correct type
    // $FlowIgnore
    response: handleMutateState((proxy: $Shape<S>)),
    rollback: false,
  };
}

// Captures the
function unwindProxyIfNeeded<O: Object>(obj: O): O {
  const descriptor = obj[PROXY_SYMBOL];
  if (descriptor) {
    const next = unwindProxyIfNeeded(descriptor.copy || descriptor.base);
    if (descriptor.base === next) {
      handle.revert(descriptor.parent, descriptor.path[descriptor.path.length - 1]);
    }
    return next;
  }
  return obj;
}

function cleanAndFreezeObjectDeeply(_obj) {
  if (!_obj || typeof _obj !== 'object') return _obj;
  const obj = unwindProxyIfNeeded(_obj);
  if (Array.isArray(obj)) {
    return maybeFreeze(obj.reduce((p, c, i) => {
      if (c && typeof c === 'object') {
        p[i] = cleanAndFreezeObjectDeeply(p[i]);
      }
      return p;
    }, obj));
  } else if (obj instanceof Set || obj instanceof Map) {
    return maybeFreeze(Array.from(obj).reduce((p, c) => {
      console.log('Set of Map Reduce! ', c);
      return p;
    }, obj));
  }
  return maybeFreeze(Object.keys(obj).reduce((p, c) => {
    const current = p[c];
    if (current && typeof current === 'object') {
      p[c] = cleanAndFreezeObjectDeeply(current);
    }
    return p;
  }, obj));
}

export default function changeState<S: { [key: string]: any }>(
  base: S,
  handleMutateState: Handle$MutateState<S>,
  handleStateChange?: Handle$StateChange<S>,
): S | $Shape<S> {
  immutaRef += 1;
  let next = base;
  let results;

  if (base == null || typeof base !== 'object') {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | base argument must be an object`);
  }

  if (typeof handleMutateState === 'function') {
    results = startStateMutation(base, handleMutateState);
  } else {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | handleMutateState must be a function`);
  }

  immutaRef -= 1;

  if (immutaRef === 0) {
    if (!results.descriptor.copy && Object.isFrozen(results.descriptor.base)) {
      next = results.descriptor.base;
    } else if (!results.descriptor.copy && config.freeze) {
      next = cleanAndFreezeObjectDeeply(results.descriptor.base);
    } else {
      next = cleanAndFreezeObjectDeeply(results.descriptor.copy);
    }
  }

  if (handleStateChange && typeof handleStateChange !== 'function') {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | When defined, handleStateChangeEvent [3] must be a function`);
  } else if (!results.descriptor || !results.proxy) {
    throw new Error(`[${MODULE_NAME}] | ERROR | changeState | An unknown error has occurred, results format mismatch`);
  } else if (handleStateChange && results.descriptor.root.changed.size > 0) {
    // state has changed!
    const doRollback = (shouldRollback: boolean = true) => {
      results.rollback = Boolean(shouldRollback);
    };
    handleStateChange(next, results.descriptor.changed, doRollback);
  }

  if (!results.rollback && results.descriptor.copy) {
    next = results.descriptor.copy;
  } else {
    next = results.descriptor.base;
  }

  if (immutaRef === 0) {
    // once done nesting, revoke proxies so that they are not accidentally used
    // elsewhere within the application (by sending them with promises, etc)
    revokeProxies(results.descriptor);
  }

  return next;
}
