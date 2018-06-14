import bench from '../run';

const totalKeys = 1000;

const obj = Object.create(null);
const map = new Map();
let i = totalKeys;
while (i--) {
  obj[i] = 'something';
  map.set(i, 'something');
}

const okeys = Object.keys(obj);
console.log(okeys.length);

global.bench = bench;

global.run = function runTests() {
  bench.run(10000, [
    () => {
      bench.start('for...in');
      for (const key in obj) {
        const value = obj[key];
      }
      bench.done();
    },
    () => {
      bench.start('for...in...hasOwn');
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
        }
      }
      bench.done();
    },
    () => {
      bench.start('Object.keys().forEach cached');
      const keys = Object.keys(obj);
      keys.forEach(key => {
        const value = obj[key];
      });
      bench.done();
    },
    () => {
      bench.start('while Hack');
      let i = totalKeys;
      while (i--) {
        const value = obj[i];
      }
      bench.done();
    },
    () => {
      bench.start('forEach - Map');
      map.forEach((value, key) => {});
      bench.done();
    },
    () => {
      bench.start('precompute - keys.ForEach');
      okeys.forEach(k => {
        const value = obj[k];
      });
      bench.done();
    },
    () => {
      bench.start('while Hack - Map');
      i = totalKeys;
      while (i--) {
        const value = map.get(i);
      }
      bench.done();
    },
    () => {
      bench.start('Object.keys().forEach');
      Object.keys(obj).forEach(key => {
        const value = obj[key];
      });
      bench.done();
    },
  ]);
};

const keepalive = () => setTimeout(() => keepalive(), 30000);

keepalive();
