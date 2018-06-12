/* @flow */
import test from 'ava';
import immuta from '../src';

const data = {
  deep: {
    map: new Map([[{ one: 'two' }, { foo: 'bar' }]]),
    map2: new Map(),
    set: new Set([{ one: 'two' }, { two: 'three' }]),
    set2: new Set(),
  },
};

test('reference not equal when deep map updates', t => {
  const next = immuta(data, draft => {
    draft.deep.map.set({ two: 'three' }, { foo: 'baz' });
  });
  t.not(data, next);
  t.not(data.deep.map, next.deep.map);
  t.is(data.deep.map2, next.deep.map2);
  t.notDeepEqual(data, next);
});

test('reference not equal when deep set updates', t => {
  const next = immuta(data, draft => {
    draft.deep.set.add({ three: 'four' });
  });
  t.not(data, next);
  t.notDeepEqual(data, next);
});

test('reference not equal when deep set clears', t => {
  const next = immuta(data, draft => {
    draft.deep.set.clear();
  });
  t.not(data, next);
  t.notDeepEqual(data, next);
});

test('reference not equal when deep map clears', t => {
  const next = immuta(data, draft => {
    draft.deep.map.clear();
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.not(data.deep.map, next.deep.map);
  t.is(data.deep.map2, next.deep.map2);
  t.is(data.deep.set, next.deep.set);
  t.is(data.deep.set2, next.deep.set2);
  t.notDeepEqual(data, next);
});

test('reference equal when empty deep map clears', t => {
  const next = immuta(data, draft => {
    draft.deep.map2.clear();
  });
  t.is(data, next);
  t.is(data.deep, next.deep);
  t.is(data.deep.map2, next.deep.map2);
  t.deepEqual(data, next);
});

test('reference equal when empty deep map set then cleared', t => {
  const next = immuta(data, draft => {
    draft.deep.map2.set(1, 2);
    draft.deep.map2.clear();
  });
  t.is(data, next);
  t.is(data.deep, next.deep);
  t.is(data.deep.map2, next.deep.map2);
  t.deepEqual(data, next);
});

test('reference equal when empty deep set clears', t => {
  const next = immuta(data, draft => {
    draft.deep.set2.clear();
  });
  t.is(data, next);
  t.is(data.deep, next.deep);
  t.is(data.deep.map2, next.deep.map2);
  t.deepEqual(data, next);
});

test('reference not equal when iterated map mutates', t => {
  const next = immuta(data, draft => {
    for (const [, v] of draft.deep.map) {
      v.t = 'hi';
    }
  });
  t.not(data, next);
  t.notDeepEqual(data, next);

  // mutating key should not do anything
  const next2 = immuta(data, draft => {
    for (const [k] of draft.deep.map) {
      k.t = 'hi';
    }
  });

  t.is(data, next2);
});
