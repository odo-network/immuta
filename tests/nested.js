/* @flow */
import test from 'ava';
import immuta from '../src';

const a1 = { one: 'two' };
const a2 = { two: 'three' };
const a3 = { three: 'four' };

const data = {
  deep: {
    bar: 'baz',
    map: new Map([[{ one: 'two' }, { foo: 'bar' }]]),
    map2: new Map(),
    set: new Set([{ one: 'two' }, { two: 'three' }]),
    set2: new Set(),
    array: [a1, a2, a3],
  },
};

test('nested calls dont cause errors or mutate when no changes are made', t => {
  const next = immuta(data, draft => {
    immuta(draft.deep, () => {
      // do nothing!
    });
  });
  t.is(data, next);
  t.deepEqual(data, next);
});

test('nested calls with mutation produce expected output', t => {
  const next = immuta(data, draft => {
    immuta(draft.deep, deepDraft => {
      deepDraft.map.set(1, 2);
    });
  });
  t.not(data.deep, next.deep);
  t.not(data.deep.map, next.deep.map);
  t.is(data.deep.map2, next.deep.map2);
  t.is(data.deep.set, next.deep.set);
  t.is(data.deep.array, next.deep.array);
  t.notDeepEqual(data, next);
});
