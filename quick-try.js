/* @flow */
import immuta from './src/immuta';

const state = Object.freeze({
  foo: { bar: { ok: 'go' }, baz: { ok: 'go' } },
  data: { map: new Map(), arr: [1, 2, 3, { one: 'two' }] },
});

const nextState = immuta(
  state,
  draftState => {
    // draftState.foo.bar.ok = 's';
    draftState.data.map.set('one', { foo: 'bar' });

    draftState.data.map.forEach(v => {
      console.log('Value: ', v);
    });

    // draftState.data.map.clear();
    // draftState.data.arr[3].two = 'foo';
    // draftState.foo.bar.ok = 'go';
  },
  (snapshot, changeMap, rollback) => {
    console.log('Changed State: ', snapshot, '\n', changeMap.keys());
    // changedState holds only the changedValues so far and is executed synchronously
    // after the draftState is called when defined.
    //
    // it also allows rollbacks so it is easy to rollback changes if they do not meet
    // some specific parameters.
    // console.log('I THINK NOT!! ROLL THAT SHYT BACK! ', rollback());
    // rollback();
  },
);

console.log('EQUAL? ', nextState === state, nextState.foo === state.foo, nextState.foo.bar === state.foo.bar);

// const nextState2 = immuta(
//   nextState,
//   draftState => {
//     draftState.foo.bar.ok = 'go';
//     // draftState.foo.bar.ok = 'go';
//   },
//   (snapshot, changeMap) => {
//     console.log('Changed State: ', snapshot, '\n', changeMap.keys());
//     // changedState holds only the changedValues so far and is executed synchronously
//     // after the draftState is called when defined.
//     //
//     // it also allows rollbacks so it is easy to rollback changes if they do not meet
//     // some specific parameters.
//     // console.log('I THINK NOT!! ROLL THAT SHYT BACK! ', rollback());
//     // rollback();
//   },
// );

// console.log(`
//   State eq 1? ${String(state === nextState)}
//   State eq 2? ${String(state === nextState2)}
//   1 eq 2?     ${String(nextState === nextState2)}
// `);

setTimeout(() => {
  console.log(nextState);
}, 500);

// const nextState2 = immuta(
//   nextState,
//   draftState => {
//     draftState.test = 'hi';
//   },
//   (changedState, changeMap) => {
//     console.log('Changed State: ', changedState);
//     // changedState holds only the changedValues so far and is executed synchronously
//     // after the draftState is called when defined.
//     //
//     // it also allows rollbacks so it is easy to rollback changes if they do not meet
//     // some specific parameters.
//     // console.log(changeMap.keys());
//     if (changedState.foo === 'fail') {
//       rollback();
//     }
//   },
// );

// console.log('Next: ', nextState === nextState2);

// const obj = {
//   one: {
//     two: 'three',
//     three: {
//       foo: 'bar',
//     },
//   },
//   two: {
//     test: 'this',
//   },
// };

// const [proxy, descriptor] = deepProxy(obj);

// // proxy.one.three = 'hi';

// proxy.one.three.bar = 'ok';

// // console.log(proxy.one.three);
// // console.log(proxy);
// // console.log('next');
// // console.log(proxy.one);

// // console.log(descriptor.root.changed);

// // proxy.one.two = 'ok';
// // proxy.test = 1;
// // console.log(descriptor.root.changed);

// console.log(obj.one === descriptor.copy);
