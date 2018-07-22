/* @flow */

import { isType, getProxiedValue } from './index';

type MergerConfig = {|
  deep?: boolean,
  // any specific types that should not be parsed
  // deeply no matter what when doing a deep merge
  shallowTypes?: Array<'map' | 'set' | 'object' | 'array'>,
|};

const defaultMergerConfig = {
  deep: true,
};

/**
 * When we want to set a new object onto a draft object,
 * we need to call this mergeDeep function as otherwise it
 * will assume the entire object has changed.   This is not
 * handled by default for performance reasons
 *
 * mergeDeep receives the proxy "draft" object at the path
 * that should be merged and does  a deep comparison.
 */
export function mergeWithDraft(draft, obj, config = defaultMergerConfig, _base) {
  // we want to use the base object for any checks since
  // modifying the draft will result in low perf due to
  // proxy.
  if (typeof obj === 'object') {
    const base = _base || getProxiedValue(draft);
    mergeDraftAtLevel(base, obj, draft, config);
  } else {
    throw new TypeError(
      '[ERORR] | Immuta | mergeWithDraft | Expects obj (2) to be an object to merge into the immutable state.',
    );
  }
  return draft;
}

/*
  Merge with the draft at a given path.  We
*/
mergeWithDraft.at = function mergeWithDraftAtPath(_draft, _path, obj, config) {
  const path = typeof _path === 'string' ? _path.split('.') : _path;
  const depth = path.length - 1;

  let base = getProxiedValue(_draft);
  let draft = _draft;
  // These values are set when we start adding new keys
  // and they are used to know where we need to set the
  // new value on the draft.
  let draftType;
  let draftKey;
  let areAddingNewKeys = false;
  let i = 0;

  for (const key of path) {
    i += 1;
    if (key === Map || key === Set) {
      continue;
    }
    draftKey = key;
    if (base instanceof Map) {
      base = base.get(key);
      draftType = 'map';
    } else {
      base = base[key];
      draftType = 'object';
    }
    if (typeof base !== 'object') {
      areAddingNewKeys = true;
      break;
    } else {
      draft = getDraftChild(draftType, draft, key);
    }
  }

  if (areAddingNewKeys) {
    const update = getTypeValue('base', path, i);
    let current = update;
    path.slice(i).forEach(key => {
      i += 1;
      if (key !== Set && key !== Map) {
        if (i <= depth) {
          const childValue = getTypeValue('base', path, i);

          setDraftChild(getTypeValue('type', path, i - 2), current, key, childValue, i);
          current = childValue;
        } else {
          setDraftChild(getTypeValue('type', path, i - 2), current, key, obj);
        }
      }
    });
    setDraftChild(draftType, draft, draftKey, update);
  } else {
    mergeWithDraft(draft, obj, config, base);
    // function deepMerge(baseValue, newValue, key, parentDraft, config, parentType = 'object') {
    // deepMerge(base, obj, draftKey, draft, config);
  }
  return _draft;
};

// in future, how do we best handle this in a way
// that could allow for building maps or sets?
function getTypeValue(type, path, i) {
  const preKey = path[i];
  if (preKey === Map) {
    return type === 'base' ? new Map() : 'map';
  }
  if (preKey === Set) {
    return type === 'base' ? new Set() : 'set';
  }
  const key = path[i + 1];
  if (!Number.isNaN(Number(key))) {
    return type === 'base' ? [] : 'array';
  }
  return type === 'base' ? {} : 'object';
}

function shouldParseDeep(type, config) {
  return !Array.isArray(config.shallowTypes) || config.shallowTypes.includes(type);
}

function getDraftChild(parentType, draft, key) {
  switch (parentType) {
    case 'map': {
      return draft.get(key);
    }
    case 'set': {
      // with sets we cant "get" the value so we are generally having
      // to instead directly iterate on the draft which is slower but
      // there is no other choice.  In this case, the draft is the
      // value we are wanting
      return draft;
    }
    case 'array':
    case 'object':
    default: {
      return draft[key];
    }
  }
}

function setDraftChild(parentType, draft, key, value) {
  switch (parentType) {
    case 'map': {
      draft.set(key, value);
      break;
    }
    case 'set': {
      draft.add(value);
      break;
    }
    case 'array':
    case 'object':
    default: {
      draft[key] = value;
      break;
    }
  }
}

function parseChildType(baseType, baseValue, newType, newValue, key, parentDraft, config, parentType) {
  switch (newType) {
    case 'object': {
      mergeDraftAtLevel(baseValue, newValue, getDraftChild(parentType, parentDraft, key), config);
      break;
    }
    case 'array': {
      const prevLength = baseValue.length - 1;
      const draftArr = getDraftChild(parentType, parentDraft, key);
      newValue.forEach((v, i) => {
        if (i > prevLength) {
          draftArr[i] = v;
        } else {
          deepMerge(baseValue[i], newValue[i], i, draftArr, config, 'array');
        }
      });
      break;
    }
    case 'map': {
      const draftMap = getDraftChild(parentType, parentDraft, key);
      newValue.forEach((v, k) => {
        const baseMapValue = baseValue.get(k);
        if (typeof v !== 'object' || typeof baseMapValue !== 'object') {
          if (baseMapValue !== v) {
            draftMap.set(k, v);
          }
        } else {
          // with map we need to be careful since the
          // map should not have properties added to it
          // like the normal set process has.
          deepMerge(baseMapValue, v, k, draftMap, config, 'map');
        }
      });
      break;
    }
    case 'set': {
      const draftSet = getDraftChild(parentType, parentDraft, key);
      newValue.forEach(v => {
        if (!baseValue.has(v)) {
          // with sets, if the type is not identical then it is
          // a completely new value regardless of anything else.
          // this could have reprucussions in the case someone
          // deletes an object, clones a new one, then adds
          // that to the object in the set as it would result
          // in both objects being within the draft,
          // although that should be a rare circumstance
          draftSet.add(v);
        }
      });
      break;
    }
    default: {
      // unhandled types use shallow comparison
      if (newValue !== baseValue) {
        parentDraft[key] = newValue;
      }
      break;
    }
  }
}

function deepMerge(baseValue, newValue, key, parentDraft, config, parentType = 'object') {
  if (typeof newValue !== 'object') {
    if (baseValue !== newValue) {
      setDraftChild(parentType, parentDraft, key, newValue);
    }
    return;
  }
  const newType = isType(newValue);
  const baseType = isType(baseValue);
  if (newType !== baseType) {
    // its a different specific type, we set on the object
    // directly;
    setDraftChild(parentType, parentDraft, key, newValue);
  } else if (!shouldParseDeep(newType, config)) {
    if (baseValue !== newValue) {
      setDraftChild(parentType, parentDraft, key, newValue);
    }
  } else {
    parseChildType(baseType, baseValue, newType, newValue, key, parentDraft, config, parentType);
  }
}

function mergeDraftAtLevel(base, obj, draft, config?: MergerConfig = defaultMergerConfig) {
  if (Array.isArray(obj)) {
    obj.forEach(value => {});
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const baseValue = base[key];
        const newValue = obj[key];
        if (!config.deep) {
          // when comparing shallow we only care if the values match
          if (baseValue !== newValue) {
            draft[key] = newValue;
          }
        } else if (typeof newValue === 'object') {
          // when comparing deep we need to identify objects of
          // various types and iterate them to generate our
          // new value
          deepMerge(baseValue, newValue, key, draft, config);
        } else if (baseValue !== newValue) {
          draft[key] = newValue;
        }
      }
    }
  }
}
