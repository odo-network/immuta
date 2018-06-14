import perf from 'perf_hooks';

const { performance } = perf;

const startTime = performance.now();

let last = performance.now();

let $test;
const tests = {};

function start(test) {
  $test = test;
  // collect();
  measure();
}

// eslint-disable-next-line
const collect = global.gc || function() {};

function measure() {
  const now = performance.now();
  const elapsed = now - last;

  last = performance.now();
  return elapsed;
}

function done() {
  // collect();
  const elapsed = measure();
  if (!tests[$test]) tests[$test] = [];
  tests[$test].push(elapsed);
}

function avg(times) {
  const sum = times.reduce((a, b) => a + b);
  return sum / times.length;
}

function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

measure('Startup Performance Tests:');
let n = 1;

function profile(fns) {
  const shuffled = shuffle(fns);
  shuffle(fns).forEach(fn => {
    fn();
  });
  console.profile();
  shuffled.forEach(fn => {
    fn();
  });
  fns.forEach(fn => {
    fn();
  });
  shuffled.forEach(fn => {
    fn();
  });
  console.profileEnd();
}

function run(samples, fns) {
  const name = `Test: ${n++}`;
  console.profile(name);
  // eslint-disable-next-line
  shuffle(fns).forEach(fn => {
    for (let i = samples; i > 0; i -= 1) {
      fn();
    }
  });
  console.profileEnd(name);

  console.log(`
    -- TESTS COMPLETED -- 

    Tested: ${Object.keys(tests).join(', ')}
    Cycles: ${tests[$test].length}
  `);

  const results = {};
  let prev;

  Object.entries(tests).forEach(([testID, value]) => {
    results[testID] = avg(value);
  });

  Object.entries(results)
    .sort((a, b) => a[1] > b[1])
    .forEach(([testID, a]) => {
      if (!prev) prev = a;
      results[testID] = a;
      const diffFromFastest = parseFloat(a - prev);
      const diffPct = (diffFromFastest / prev) * 100;
      console.log(
        `  ${testID.padEnd(30)} | ${String(a.toFixed(10)).padEnd(20)} | -${diffFromFastest.toFixed(10)} ( ${String(
          `${diffPct.toFixed(2)} % Slower`,
        ).padEnd(15)} ) `,
      );
    });

  console.log('  ');
  console.log(performance.now() - startTime);
}

export default {
  profile,
  run,
  avg,
  start,
  done,
};
