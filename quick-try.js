/* @flow */
import immuta from './src/immuta';
import printDifference from './print-difference';

const state = {
  deep: {
    foo: {
      bar: {
        baz: true,
      },
    },
    set: new Set([{ one: 'two' }, { two: 'three' }]),
    map: new Map(),
    array: [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }, { i: 5 }],
  },
};

const next = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    draft.deep.set.clear();
    draft.deep.set.add({ one: 'two' });
    draft.deep.array[1].data = { one: 'two' };
    // / do stuff
    // if (draft.deep.map.size === 0) {
    //   delete draft.deep.array[1].data;
    // }
    draft.deep.array[2].i += 5;

    draft.deep.array.push({
      i: 6,
      new: 'value',
    });

    draft.deep.map.set('YoYo', 1);
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { 'path.to.change' => changedValue }
    // changedState is the new state being returned to caller (nextState)
  },
);

printDifference(state, next);
