/* @flow */
import immuta from './src/immuta';
import printDifference from './src/utils/print-difference';

const state = {
  deep: {
    foo: {
      bar: {
        baz: true,
      },
    },
    set: new Set([{ one: 'two' }, { two: 'three' }]),
    map: new Map([['one', { foo: 'bar' }]]),
    array: [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }, { i: 5 }],
  },
};

const next = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    const one = draft.deep.map.get('one');
    if (one) {
      one.foo = 1;
    }

    draft.deep.set.clear();
    draft.deep.set.add({ some: 'obj' });

    draft.deep.array[2].foo = 'bar!';
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { 'path.to.change' => changedValue }
    // changedState is the new state being returned to caller (nextState)
    changedMap.forEach((v, changedKey) => {
      console.log('Change: ', changedKey);
    });
  },
);

printDifference(state, next);

console.log(state.deep.set === next.deep.set);
console.log(state.deep.set);
console.log(next.deep.set);

// console.log(next.deep.map.get('one'));
