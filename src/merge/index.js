/* @flow */
import type { MergerConfig, MergerPath } from '../types';

import { MODULE_NAME } from '../utils/context';

import { merge } from './merge';

// dont allocate a new object for every
// operation.
const config: MergerConfig = {
  path: [],
  deep: true,
};

// function isMergeable(target) {
//   if (typeof target !== 'object') {
//     throw new TypeError(
//       `[ERROR] | ${MODULE_NAME} | mergeWithDraft | ${typeof target} is not a mergeable value, expected object.`,
//     );
//   }
// }

function isValidMergeConfig() {
  if (!Array.isArray(config.path)) {
    throw new TypeError(
      `[ERROR] | ${MODULE_NAME} | mergeWithDraft | ${typeof config.path} is not a valid path, expected string or Array value.`,
    );
  }
}

function validateMergeIsValid() {
  // can we merge (is target object);
  // isMergeable(target);
  // is config valid?
  isValidMergeConfig();
}

function getPath(path) {
  if (typeof path === 'string') {
    // $FlowIgnore
    return (path.split('.'): MergerPath);
  }
  return path || [];
}

/**
 * merge is a utility which helps with performance when conducting
 * more complex operations against the draft proxy.  Since querying
 * the proxy will create new proxies in a deep fashion, this means
 * that many merge operations against it could drastically reduce
 * performance.
 *
 * merge instead will conduct the merge by getting the base value
 * of the proxy and using it to understand where mutations are needed
 * and only conducting the mutations against the proxy in those places.
 *
 * This means we can get near-native performance while doing deep merge
 * operations on our drafts.
 *
 * merge is called by using the paths set on the exported function to
 * configure how merge will occur
 *
 * mergeWithDraft = mergeWithDraft.deep
 * mergeWithDraft.at = mergeWithDraft.deep.at
 * mergeWithDraft.deep
 * mergeWithDraft.shallow
 * mergeWithDraft.deep.at
 * mergeWithDraft.shallow.at
 *
 * may also use
 *
 * mergeWithDraft.at.deep
 * mergeWithDraft.at.shallow
 */
function mergeTargets<+D>(draft: D, targets: Object[]) {
  targets.forEach(target => {
    validateMergeIsValid();
    merge(draft, target, config);
  });
}

export function mergeWithDraft<+D>(draft: D, ...targets: Object[]) {
  config.path = [];
  config.deep = true;
  return mergeTargets(draft, targets);
}

function mergeWithDraftAtPathShallow<+D>(draft: D, path: string | MergerPath, ...targets: Object[]) {
  config.path = getPath(path);
  config.deep = false;
  return mergeTargets(draft, targets);
}

function mergeWithDraftAtPath<+D>(draft: D, path: string | MergerPath, ...targets: Object[]) {
  config.path = getPath(path);
  config.deep = true;
  return mergeTargets(draft, targets);
}

function mergeWithDraftShallow<+D>(draft: D, ...targets: Object[]) {
  config.path = [];
  config.deep = false;
  return mergeTargets(draft, targets);
}

mergeWithDraft.deep = mergeWithDraft;
mergeWithDraft.shallow = mergeWithDraftShallow;
mergeWithDraft.at = mergeWithDraftAtPath;

mergeWithDraft.at.deep = mergeWithDraft.deep.at = mergeWithDraftAtPath;
mergeWithDraft.at.shallow = mergeWithDraft.shallow.at = mergeWithDraftAtPathShallow;
