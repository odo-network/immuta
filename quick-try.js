import immuta, { mergeWithDraft } from './src';

const kv = {
  my: 'key',
};

const kv2 = {
  another: 'key',
};

const foo = {
  foo: 'boo!',
};

const bar = {
  bar: 'yep!',
};

const state = {
  one: {
    two: {
      map: new Map([[kv, kv2], ['hello', 'world']]),
      foo: 'bar',
    },
  },
};

const update = {
  two: {
    lets: 'go',
    map: new Map([[kv, foo], [bar, foo], ['hello', 'world!']]),
  },
};

const next = immuta(
  state,
  draft => {
    mergeWithDraft(draft.one, update);
  },
  (nextState, changes) => {
    console.log('Changes: ', changes);
  },
);

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
