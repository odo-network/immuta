/* @flow */
import test from 'ava';
import immuta from '../src';

const data = {
  deep: {
    bar: 'baz',
  },
  deep2: {
    baz: 'quxqux',
  },
};

test('reference equal when rollback is called', t => {
  const next = immuta(
    data,
    draft => {
      draft.deep.bar = 'qux';
    },
    (changed, map, rollback) => {
      rollback();
    },
  );
  t.is(data, next);
  t.deepEqual(data, next);
  t.is(data.deep, next.deep);
  t.is(data.deep.bar, next.deep.bar);
});

test('changed map reflects all changed references', t => {
  immuta(
    data,
    draft => {
      draft.deep.bar = 'qux';
    },
    (changed, map) => {
      // in order to test the map we will mutate the keys
      const stringPaths = [...map.keys()].map(e => e.join('.'));
      t.deepEqual(stringPaths, ['deep', 'deep.bar']);
      // compare each value in the changedMap to the changed state
      map.forEach((v, k) => {
        const v2 = k.reduce((p, c) => p[c], changed);
        // grab the previous value from data directly
        const prevValue = k.reduce((p, c) => p[c], data);
        t.not(prevValue, v2);
        t.is(v, v2);
        t.deepEqual(v, v2);
        t.notDeepEqual(prevValue, v2);
      });
    },
  );
});
