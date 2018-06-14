/* @flow */
import test from 'ava';
import immuta from '../src';

const data = {
  deep: {
    bar: 'baz',
  },
};

test('reference equal when no changes', t => {
  const next = immuta(data, draft => {
    draft.deep.bar = 'baz';
  });
  t.is(data, next);
  t.is(data.deep, next.deep);
  t.deepEqual(data, next);
});

test('reference not equal when deep changes occur', t => {
  const next = immuta(data, draft => {
    draft.deep.bar = 'quz';
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.notDeepEqual(data, next);
});

test('reference not equal when property deletion occurs', t => {
  const next = immuta(data, draft => {
    delete draft.deep.bar;
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.notDeepEqual(data, next);
});

test('reference equal when property deletion occurs but is reverted', t => {
  const next = immuta(data, draft => {
    delete draft.deep.bar;
    draft.deep.bar = 'baz';
  });
  t.is(data, next);
  t.is(data.deep, next.deep);
  t.deepEqual(data, next);
});

test('reference changes when mutating object in iteration', t => {
  const next = immuta(data, draft => {
    Object.keys(draft).forEach(k => {
      const v = draft[k];
      v.test = 'newval';
    });
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.notDeepEqual(data, next);
  t.deepEqual(next, {
    deep: {
      ...data.deep,
      test: 'newval',
    },
  });
});

test('values are deeply frozen when returned', t => {
  const next = immuta(data, draft => {
    Object.keys(draft).forEach(k => {
      const v = draft[k];
      v.test = 'newval';
    });
  });
  t.throws(() => delete next.deep);
  t.throws(() => {
    next.something = 'another';
  });
  t.throws(() => {
    next.deep.bar = 'another';
  });
});

test('setting object then retrieving object and mutating works as expected', t => {
  const next = immuta(data, draft => {
    draft.deep.foo = {
      one: 'two'
    }

    draft.deep.foo.two = 'three';
  });
  t.not(data, next);
  t.notDeepEqual(data, next);
  
});
