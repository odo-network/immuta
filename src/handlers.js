/* @flow */
import type { ProxyDescriptor } from './types';
import * as utils from './utils';

/**
 * handle.change handles changing values.  It will propertly setup our root values so that we can
 * identify and maintain changes in our familly.
 *
 * @param {ProxyDescriptor} descriptor
 * @param {any} key
 * @param {any} value
 * @param {?boolean?} isDelete
 */
export function change<S: Object>(
  descriptor: ProxyDescriptor<S>,
  key: string,
  value: any,
  isDelete?: boolean = false,
) {
  if (descriptor.children[key] && typeof value !== 'object') {
    // console.log('Delete');
    // no longer an object so previous proxy can be removed
    delete descriptor.children[key];
  }

  // console.log(descriptor.base[key], value);

  if (descriptor.base[key] === value) {
    // value has returned to the base value - it is not changed anymore
    return revert(descriptor, key);
  }
  if (!descriptor.root.modified.has(descriptor)) {
    descriptor.root.modified.add(descriptor);
    descriptor.copy = utils.shallowCopy(descriptor.base);
    if (!descriptor.isRoot) {
      change(descriptor.parent, descriptor.path[descriptor.path.length - 1], descriptor.copy);
    }
  }
  if (descriptor.copy) {
    if (isDelete) {
      delete descriptor.copy[key];
    } else {
      descriptor.copy[key] = value;
    }
    const paths = utils.getPaths(descriptor, key);
    descriptor.root.changed.set(paths.current, value);
    descriptor.root.changedBy.addSet(paths.parent, paths.current);
  }
}

/**
 * handle.revert is used to handle a reversion to the base value.
 * It will iterate and rebuild the original object and bubble up
 * if no other changes were made to other values.
 *
 * @param {ProxyDescriptor} descriptor
 * @param {string} key
 */
export function revert<S: Object>(descriptor: ProxyDescriptor<S>, key: string) {
  if (!descriptor.copy || !descriptor.copy[key]) {
    throw new Error('reversion error?');
  }

  const paths = utils.getPaths(descriptor, key);
  descriptor.root.changed.delete(paths.current);
  descriptor.root.changedBy.remove(paths.parent, paths.current);

  if (descriptor.root.changedBy.sizeSet(paths.parent) === 0) {
    // the parent doesn't have any children that have been modified - revert to
    // base object.
    if (descriptor.copy) {
      delete descriptor.copy;
    }
    descriptor.root.modified.delete(descriptor);
    if (!descriptor.isRoot) {
      revert(descriptor.parent, descriptor.path[descriptor.path.length - 1]);
    }
  }
  if (descriptor.copy) {
    // we need to set our base value back on the copy
    // if it still exists
    descriptor.copy[key] = descriptor.base[key];
  }
}
