/* @flow */
import type { ProxyDescriptor } from '../types';

export const PROXY_SYMBOL = Symbol('STATE_PROXY');

export const MODULE_NAME = 'immuta';

export const OBJ_DESCRIPTORS: Map<any, ProxyDescriptor<*>> = new Map();
