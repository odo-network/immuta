/* @flow */

export const PROXY_SYMBOL = Symbol('STATE_PROXY');

export const MODULE_NAME = 'immuta';

export const IS_MAP = Symbol('PROXY_MAP');

export const IS_SET = Symbol('PROXY_SET');

export const RE_PROPERTY = /(?:get|set|has|map|clear)\((.*)\)/;

export const RE_STRIP = /(.*)\(=> \[(?:SET|MAP)\]\)/;

export const RE_ARGS = /\((.*)\)/;
