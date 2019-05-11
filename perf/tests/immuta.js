import immer from 'immer';
import bench from '../run';
import immuta from '../../src/immuta';

// ! TODO - Need to conduct real perf testing

const obj = {
  deep: {
    foo: 'bar',
  },
};

global.bench = bench;

const tests = [
  function $immuta() {
    console.time('$immuta');
    immuta(obj, draft => {
      draft.deep.foo = 'baz';
    });
    console.timeEnd('$immuta');
  },
  function $immer() {
    console.time('$immer');
    immer(obj, draft => {
      draft.deep.foo = 'baz';
    });
    console.timeEnd('$immer');
  },
];

global.getProfiles = () => bench.profile(tests);

global.run = function runTests() {
  bench.run(10, tests);
};

const keepalive = () => setTimeout(() => keepalive(), 30000);

keepalive();
