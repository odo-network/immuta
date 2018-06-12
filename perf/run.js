import { performance } from 'perf_hooks';
import immuta from '../src/immuta';
import immer from '../.junk/src/immer';

let last = performance.now();

let $test;
const tests = {};

function start(test) {
  $test = test;
  measure();
}

function measure() {
  global.gc && global.gc();
  const now = performance.now();
  const elapsed = now - last;

  last = performance.now();
  return elapsed;
}

function done() {
  global.gc && global.gc();
  const elapsed = measure();
  if (!tests[$test]) tests[$test] = [];
  tests[$test].push(elapsed);
}

function avg(times) {
  const sum = times.reduce((a, b) => a + b);
  const a = sum / times.length;
  return a;
}

measure('Startup Performance Tests:');

global.gc && global.gc();

function run(samples, fns) {
  for (let i = 0; i <= samples; i += 1) {
    fns.forEach(fn => fn());
  }
  console.log(`
    -- TESTS COMPLETED -- 

    Tested: ${Object.keys(tests).join(', ')}
    Cycles: ${tests[$test].length}
  `);
  Object.keys(tests).forEach(testID => {
    console.log(`  ${testID.padEnd(10)} | ${avg(tests[testID])}`);
  });
  console.log('  ');
}

run(10000, [
  () => {
    start('immer');
    const one = {
      foo: {
        bar: 'baz',
        baz: [{ one: 'two' }, { two: 'three' }],
      },
    };

    const two = immer(one, draftState => {
      draftState.foo.foo = 'q';
      draftState.foo.baz.shift();
      draftState.foo.baz.push({ three: 'four' });
      draftState.foo.baz.pop();
      draftState.foo.baz.forEach(e => {
        e.t = 'one';
      });
    });
    done();
  },
  () => {
    start('immuta');
    const one = {
      foo: {
        bar: 'baz',
        baz: [{ one: 'two' }, { two: 'three' }],
      },
    };

    const two = immuta(one, draftState => {
      draftState.foo.foo = 'q';
      draftState.foo.baz.shift();
      draftState.foo.baz.push({ three: 'four' });
      draftState.foo.baz.pop();
      draftState.foo.baz.forEach(e => {
        e.t = 'one';
      });
    });

    done();
  },
]);

// describe('loading large set of data', () => {
//   const dataSet = require('./data.json');
//   const baseState = {
//     data: null,
//   };
//   const frozenBazeState = deepFreeze(cloneDeep(baseState));
//   const immutableJsBaseState = fromJS(baseState);

//   function measure(name, fn) {
//     global.gc && global.gc();
//     test(name, fn);
//   }

//   {
//     const draft = cloneDeep(baseState);
//     measure('just mutate', () => {
//       draft.data = dataSet;
//     });
//   }

//   {
//     const draft = cloneDeep(baseState);
//     measure('just mutate, freeze', () => {
//       draft.data = dataSet;
//       deepFreeze(draft);
//     });
//   }

//   measure('handcrafted reducer (no freeze)', () => {
//     const nextState = {
//       ...baseState,
//       data: dataSet,
//     };
//   });

//   measure('handcrafted reducer (with freeze)', () => {
//     const nextState = deepFreeze({
//       ...baseState,
//       data: dataSet,
//     });
//   });

//   measure('immutableJS', () => {
//     const state = immutableJsBaseState.withMutations(state => {
//       state.setIn(['data'], fromJS(dataSet));
//     });
//   });

//   measure('immutableJS + toJS', () => {
//     const state = immutableJsBaseState
//       .withMutations(state => {
//         state.setIn(['data'], fromJS(dataSet));
//       })
//       .toJS();
//   });

//   measure('immer (proxy) - without autofreeze', () => {
//     setUseProxies(true);
//     setAutoFreeze(false);
//     produce(baseState, draft => {
//       draft.data = dataSet;
//     });
//   });

//   measure('immer (proxy) - with autofreeze', () => {
//     setUseProxies(true);
//     setAutoFreeze(true);
//     produce(frozenBazeState, draft => {
//       draft.data = dataSet;
//     });
//   });

//   measure('immer (es5) - without autofreeze', () => {
//     setUseProxies(false);
//     setAutoFreeze(false);
//     produce(baseState, draft => {
//       draft.data = dataSet;
//     });
//   });

//   measure('immer (es5) - with autofreeze', () => {
//     setUseProxies(false);
//     setAutoFreeze(true);
//     produce(frozenBazeState, draft => {
//       draft.data = dataSet;
//     });
//   });
// });
