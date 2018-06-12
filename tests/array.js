/* @flow */
import test from 'ava';
import immuta from '../src';

const a1 = { one: 'two' };
const a2 = { two: 'three' };
const a3 = { three: 'four' };

const data = {
  deep: {
    obj: {
      some: 'value',
    },
    array: [a1, a2, a3],
  },
};

test('array pop works as expected', t => {
  // pop will mutate the array
  const next = immuta(data, draft => {
    draft.deep.array.pop();
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.is(data.deep.obj, next.deep.obj);
  t.deepEqual(next.deep.array, [{ one: 'two' }, { two: 'three' }]);
  // confirm reference equality
  t.is(next.deep.array[0], a1);
  t.is(next.deep.array[1], a2);
});

test('array pop/mutate/push works as expected', t => {
  // pop will mutate the array - once this is done the array can not
  // be "reconstructed" by pushing the same value back (the popped value is shallowCopied and not proxied)
  const next = immuta(data, draft => {
    const last = draft.deep.array.pop();
    // it doesnt matter if we do or dont mutate here, "last" is shallow copied if an object
    draft.deep.array.push(last);
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.is(data.deep.obj, next.deep.obj);

  // // confirm reference equality
  t.is(next.deep.array[0], a1);
  t.is(next.deep.array[1], a2);
  // while the actual values are deep equal
  t.deepEqual(next.deep.array, [a1, a2, a3]);
  // the reference will not be
  t.not(next.deep.array[2], a3);
  // and the values are deep equal even though the references do not match
  t.deepEqual(data, next);
  // t.not(next.deep.array[2], data.deep.array[2]);
});

test('array shift works as expected', t => {
  const next = immuta(data, draft => {
    draft.deep.array.shift();
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.deepEqual(next.deep.array, [a2, a3]);
  // confirm reference equality
  t.is(next.deep.array[0], a2);
  t.is(next.deep.array[1], a3);
  t.is(data.deep.obj, next.deep.obj);
});

test('array mutation works as expected', t => {
  const next = immuta(data, draft => {
    draft.deep.array[1].val = 'bar';
  });
  t.not(data, next);
  // confirm other values are equal
  t.is(next.deep.array[0], data.deep.array[0]);
  t.not(next.deep.array[1], data.deep.array[1]);
  t.is(next.deep.array[2], data.deep.array[2]);
  t.is(data.deep.obj, next.deep.obj);
});

test('array push works as expected', t => {
  const next = immuta(data, draft => {
    draft.deep.array.push('bar');
  });
  t.not(data, next);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.is(data.deep.obj, next.deep.obj);
  t.is(next.deep.array[next.deep.array.length - 1], 'bar');
  t.not(data.deep.array[data.deep.array.length - 1], 'bar');
  t.deepEqual(next.deep.array, [a1, a2, a3, 'bar']);
});

test('array forEach works as expected', t => {
  const next = immuta(data, draft => {
    draft.deep.array.forEach(e => {
      e.val = 'new';
    });
  });
  t.not(data, next);
  t.is(data.deep.obj, next.deep.obj);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.not(next.deep.array[0], data.deep.array[0]);
  t.not(next.deep.array[1], data.deep.array[1]);
  t.not(next.deep.array[2], data.deep.array[2]);
  t.notDeepEqual(data, next);
  t.deepEqual(next.deep.array, [{ ...a1, val: 'new' }, { ...a2, val: 'new' }, { ...a3, val: 'new' }]);
});

test('array for...of works as expected', t => {
  const next = immuta(data, draft => {
    for (const e of draft.deep.array) {
      e.val = 'new';
    }
  });
  t.not(data, next);
  t.is(data.deep.obj, next.deep.obj);
  t.not(data.deep, next.deep);
  t.not(data.deep.array, next.deep.array);
  t.not(data.deep.array[0], next.deep.array[0]);
  t.not(data.deep.array[1], next.deep.array[1]);
  t.not(data.deep.array[2], next.deep.array[2]);
  t.deepEqual(next.deep.array, [{ ...a1, val: 'new' }, { ...a2, val: 'new' }, { ...a3, val: 'new' }]);
});

test('array iteration without mutation returns original references', t => {
  // but shouldnt if we iterate without actual changes
  const next = immuta(data, draft => {
    draft.deep.array.forEach(() => {
      // do something with e
    });
    for (const e of draft.deep.array) {
      // do something with e - we throw just to use it for eslint/flow satisfaction
      if (!e) throw new Error('Unknown');
    }
  });
  t.is(data, next);
  t.deepEqual(data, next);
});
