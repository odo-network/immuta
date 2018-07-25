/* @flow */
import type { ProxyDescriptor } from '../types';

// type UnfrozenObjectsType<P> = WeakMap<ProxyDescriptor<P>, P>;

export const PROXY_SYMBOL = Symbol('STATE_PROXY');

export const MODULE_NAME = 'immuta';

export const OBJ_DESCRIPTORS: Map<any, ProxyDescriptor<*>> = new Map();

// export const UNFROZEN_OBJECTS: UnfrozenObjectsType<*> = new WeakMap();
