/* @flow */
import type { ProxyDescriptor, PossibleValueTypes, MergerConfig } from '../types';
// import { MODULE_NAME } from '../utils/context';
import {
  setDescriptorsValue, getValue, isType, getChildProxy, getProxyDescriptor,
} from '../utils';

type TypesObj = {
  equal: boolean,
  target: void | PossibleValueTypes,
  source: void | PossibleValueTypes,
};

const types: TypesObj = {
  equal: true,
  target: undefined,
  source: undefined,
};

function getTypes(sourceDescriptor, target) {
  types.source = sourceDescriptor.type;
  types.target = isType(target);
  types.equal = types.target === types.source;
}

function mergeChild<+S: Object, K>(descriptor: ProxyDescriptor<S>, key: K, value: S, config: MergerConfig) {
  // we need to iterate further
  // handleMergeIntoProxy();
  const childProxy = getChildProxy(descriptor, key);
  if (childProxy === null) {
    throw new Error('UNKNOWN REASON COULDNT GET CHILD PROXY IN MERGEOBJECTS');
  }
  const childDescriptor = getProxyDescriptor(childProxy);
  handleMergeIntoDescriptor(childDescriptor, value, config);
}

function mergeObjects<+S: Object, +C: MergerConfig>(descriptor: ProxyDescriptor<S>, target: S, config: C) {
  const source = getValue(descriptor);
  const { proxy } = descriptor;
  if (!proxy) {
    throw new Error('Proxy Not Found in mergeObjects?');
  }
  for (const targetKey in target) {
    if (Object.prototype.hasOwnProperty.call(target, targetKey)) {
      const targetValue = target[targetKey];
      if (config.deep && typeof targetValue === 'object' && typeof source[targetKey] === 'object') {
        mergeChild(descriptor, targetKey, targetValue, config);
      } else {
        proxy[targetKey] = targetValue;
      }
    }
  }
}

function mergeArrays<+S: Object, +C: MergerConfig>(descriptor: ProxyDescriptor<S>, target: S, config: C) {
  const source = getValue(descriptor);
  const { proxy } = descriptor;
  if (!proxy) {
    throw new Error('Proxy Not Found in mergeArrays?');
  }
  target.forEach((targetValue, targetKey) => {
    // $FlowIgnore
    const sourceValue = source[targetKey];
    if (config.deep && typeof targetValue === 'object' && typeof sourceValue === 'object') {
      mergeChild(descriptor, targetKey, targetValue, config);
    } else {
      proxy[targetKey] = targetValue;
    }
  });
}

function mergeMaps<+S: Object, +C: MergerConfig>(descriptor: ProxyDescriptor<S>, target: S, config: C) {
  const sourceValue = getValue(descriptor);
  target.forEach((targetValue, targetKey) => {
    const sourceChildValue = sourceValue.get(targetKey);
    if (!config.deep || (typeof targetValue !== 'object' || typeof sourceChildValue !== 'object')) {
      // $FlowIgnore
      return descriptor.proxy.set(targetKey, targetValue);
    }
    mergeChild(descriptor, targetKey, targetValue, config);
  });
}

function mergeSets<+S: Object>(descriptor: ProxyDescriptor<S>, target: S) {
  // sets need to be handled specially as we do not have any
  // method for retrieving a set value (since its a unique ref)
  const source = getValue(descriptor);
  target.forEach(v => {
    // $FlowIgnore
    if (!source.has(v)) {
      // $FlowIgnore
      descriptor.proxy.add(v);
    }
  });
}

export function handleMergeIntoDescriptor<+S: Object, +C: MergerConfig>(
  descriptor: ProxyDescriptor<S>,
  target: S,
  config: C,
) {
  getTypes(descriptor, target);

  const { equal, target: targetType } = types;

  if (!equal) {
    return setDescriptorsValue(descriptor, target);
  }

  switch (targetType) {
    case 'object': {
      return mergeObjects(descriptor, target, config);
    }
    case 'array': {
      return mergeArrays(descriptor, target, config);
    }
    case 'map': {
      return mergeMaps(descriptor, target, config);
    }
    case 'set': {
      return mergeSets(descriptor, target);
    }
    default: {
      break;
    }
  }
}
