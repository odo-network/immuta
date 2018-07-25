import immuta, { mergeWithDraft } from './src';
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
    mergeWithDraft(draft, {
      deep: {
        foo: {
          bar: {
            foo: true,
          },
        },
        set: new Set([{ three: 'four' }]),
        map: new Map([['one', { bar: 'baz' }]]),
        array: [{ foo: 'bar' }],
      },
    });
    mergeWithDraft.at(draft, 'deep.array.3.deeper.path.than.it.had', { at: 'merge' });
    mergeWithDraft.at(draft, ['deep', 'map', { object: 'key' }, 'also', 'works'], { foo: 'bar' });
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { ['path', 'to', 'change'] => changedValue }
    //  * Note that each value or reference that is changed will have an entry in the map
    // changedState is the new state being returned to caller (nextState)
    changedMap.forEach((v, changedKey) => {
      console.log('Change: ', changedKey);
    });
  },
);

printDifference(state, next);
console.log(`
  --- RESULTS ---

  Is Equal?  ${next === state}

  Old Value:
  ${JSON.stringify(state, null, 2)}

  New Value:
  ${JSON.stringify(next, null, 2)}
`);

// const expected = {
//   one: {
//     two: Map {
//       { key: 'value' } =>
//         {
//           deal: {
//             ok: {
//               foo: 'bar'
//             }
//           }
//         }
//     }
//   }
// }

console.log(next === state);
console.log(next);
console.log(next.one);
