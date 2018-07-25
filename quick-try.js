import immuta, { mergeWithDraft } from './src';
import printDifference from './src/utils/print-difference';

const k1 = { foo: 1 };
const k2 = { bar: 2 };
const k3 = { baz: 3 };

const state = {
  map: new WeakMap([[k1, k2]]),
};

const next = immuta(state, draft => {
  mergeWithDraft.at(draft, ['map', k1], k3);
});

// printDifference(state, next);

console.log(state.map.get(k1));

console.log(next);

console.log(next.map.get(k1));
// console.log(`
//   --- RESULTS ---

//   Is Equal?  ${next === state}

//   Old Value:
//   ${JSON.stringify(state, null, 2)}

//   New Value:
//   ${JSON.stringify(next, null, 2)}
// `);

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
