/* @flow */
import type { ProxyDescriptor } from '../types';
import * as utils from '../utils';

import { createChildDescriptor } from './index';

/**
 * handle.change handles changing values.  It will propertly setup our root values so that we can
 * identify and maintain changes in our familly.
 *
 * @param {ProxyDescriptor} descriptor
 * @param {any} key
 * @param {any} value
 * @param {?boolean?} isDelete
 */
export function change<+S: Object>(
  descriptor: ProxyDescriptor<S>,
  key: string,
  value: any,
  isDelete?: boolean = false,
) {
  if ((isDelete && !utils.hasProperty(utils.getValue(descriptor), key)) || utils.is(descriptor.base, key, value)) {
    // value has returned to the base value - it is not changed anymore
    return revert(descriptor, key);
  }

  if (!utils.hasProperty(descriptor, 'copy')) {
    // we sometimes have already created the copy when using
    // Set or Map apply
    descriptor.copy = utils.shallowCopy(descriptor.base);
    if (!descriptor.isRoot) {
      change(descriptor.parent, descriptor.path[descriptor.path.length - 1], descriptor.copy);
    }
  }

  if (descriptor.copy instanceof Map) {
    if (isDelete) {
      descriptor.copy.delete(key);
    } else {
      descriptor.copy.set(key, value);
    }
  } else {
    Reflect.set(descriptor.copy, key, value);
  }

  let childDescriptor = descriptor.children.get(key);

  if (!childDescriptor) {
    childDescriptor = createChildDescriptor(value, key, descriptor);
  } else {
    childDescriptor.copy = value;
    // if (!descriptor.root.modified.has(childDescriptor)) {
    //   descriptor.root.modified.add(childDescriptor);
    // }
  }

  const { path } = childDescriptor;

  descriptor.root.changed.set(path, value);
  descriptor.root.changedBy.addSet(descriptor.path, path);

  return true;
}

/**
 * handle.revert is used to handle a reversion to the base value.
 * It will iterate and rebuild the original object and bubble up
 * if no other changes were made to other values.
 *
 * @param {ProxyDescriptor} descriptor
 * @param {string} key
 */
export function revert<+S: Object>(descriptor: ProxyDescriptor<S>, key: string) {
  let childDescriptor;
  if (descriptor.base instanceof Map || descriptor.base instanceof Set) {
    childDescriptor = descriptor;
  } else {
    childDescriptor = descriptor.children.get(key);
  }

  if (!childDescriptor) {
    throw new Error('Reversion Fail');
  }

  const { path } = childDescriptor;

  descriptor.root.changed.delete(path);
  descriptor.root.changedBy.remove(descriptor.path, path);

  if (descriptor.root.changedBy.sizeSet(descriptor.path) === 0) {
    // the parent doesn't have any children that have been modified - revert to
    // base object.
    if (utils.hasProperty(descriptor, 'copy')) {
      delete descriptor.copy;
    }
    // descriptor.root.modified.delete(descriptor);
    if (!descriptor.isRoot) {
      revert(descriptor.parent, descriptor.path[descriptor.path.length - 1]);
    }
  }
  if (descriptor.copy) {
    // we need to set our base value back on the copy
    // if it still exists
    descriptor.copy[key] = descriptor.base[key];
  }
  return true;
}
