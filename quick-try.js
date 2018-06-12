/* @flow */
import immuta from './src/immuta';
import printDifference from './src/utils/print-difference';

const a = { a: 'one' };

const state = {
  deep: {
    foo: {
      bar: {
        baz: true,
      },
    },
    re: new RegExp(/one/),
    date: new Date(),
    set: new Set([{ one: 'two' }, { two: 'three' }]),
    map: new Map([[a, { foo: { one: 'bar' } }], [{ a: 'two' }, { baz: 'qux' }]]),
    map2: new Map(),
    array: [{ one: 'foo' }, { two: 'foo' }, { three: 'four' }],
  },
};

const next = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    // console.log('a: ', draft.deep.map.get);
    // const one = draft.deep.map.get(a);

    // one.bar = 'baz';

    // draft.deep.map.set(11, { one: 'foo' });

    // draft.deep.map.forEach((k, v) => {
    //   console.log('V! ', k, v);
    //   k.t = 'ok';
    // });

    // for (const [k, v] of draft.deep.map) {
    //   v.val = 'new';
    // }
    immuta(draft.deep, draft2 => {
      draft2.foo.bar.baz = false;
    });

    // console.log(b);
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { 'path.to.change' => changedValue }
    // changedState is the new state being returned to caller (nextState)
    console.log([...changedMap.keys()]);
    // changedMap.forEach((v, changedKey) => {
    //   // console.log('Change: ', changedKey, v);
    // });
  },
);

printDifference(state, next);

setTimeout(() => {
  console.log(
    state === next,
    state.deep === next.deep,
    state.deep.map === next.deep.map,
    state.deep.map.get(a) === next.deep.map.get(a),
    state.deep.array === next.deep.array,
  );
  // console.log(state);
  console.log(state.deep.map2);
  console.log(next.deep.map2);
});

// console.log(next.deep.map.get('one'));
