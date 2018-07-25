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
    mergeWithDraft.at(draft, 'deep.array.3.deeper.path.than.it.had', {
      at: 'merge',
    });

    const objKey = { object: 'key' };

    mergeWithDraft.at(draft, ['deep', 'map', objKey, 'also', 'works'], { foo: 'bar' });

    // we can also do some crazy type check voodoo along the way

    mergeWithDraft.at(draft, ['deep', 'map', objKey, [Map, 'map2'], 'key'], { wait: 'what?' });
  },
  (changedState, changedMap, rollback) => {
    changedMap.forEach((v, changedKey) => {
      console.log('Change: ', changedKey);
    });
  },
);

printDifference(state, next);

console.log(JSON.stringify(next, null, 2));
