## Immuta

### UNFINISHED

Immuta is the son of Immer, a simple immutable library. Immuta was born out of the desire to build a state management & subscription system for React that could be far more efficient than current solutions. It provides the ability to receive the exact values within your state that were changed on each mutation while remaining performant and lean.

> This library is **heavily** inspired by the awesome [immer](https://github.com/mweststrate/immer) library. It adds the "onChange" handler, rollbacks, change snapshots, and support for ES6 Maps & Sets. Most of these changes were built to provide a performant and flexible state management library when used in conjunction with [state-modules](https://github.com/odo-network/state-modules).

### Installation

```
yarn add immuta
```

**or**

```
npm i --save immuta
```

### Flow Coverage

This library aims to provide 100% FlowType Coverage.

### Reference

#### immuta `default export`

##### Example

```javascript
import immuta from "immuta";

const state = {
  deep: {
    map: new Map(),
    array: [{ i: 1 }, { i: 2 }, { i: 3 }]
  }
};

const nextState = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    draft.deep.array[1].data = { one: "two" };
    /// do stuff
    if (draft.deep.map.size === 0) {
      delete draft.deep.array[1].data;
    }
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { 'path.to.change' => changedValue }
    // changedState is the new state being returned to caller (nextState)
  }
);

console.log(nextState === state); // false
```

#### Difference Example

```javascript
import immuta from "./src/immuta";
import printDifference from "./print-difference";

const state = {
  deep: {
    foo: {
      bar: {
        baz: true
      }
    },
    set: new Set([{ one: "two" }, { two: "three" }]),
    map: new Map(),
    array: [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }, { i: 5 }]
  }
};

const next = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    draft.deep.set.clear();
    draft.deep.set.add({ one: "two" });
    draft.deep.array[1].data = { one: "two" };
    // / do stuff
    // if (draft.deep.map.size === 0) {
    //   delete draft.deep.array[1].data;
    // }
    draft.deep.array[2].i += 5;

    draft.deep.array.push({
      i: 6,
      new: "value"
    });

    draft.deep.map.set("YoYo", 1);
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { 'path.to.change' => changedValue }
    // changedState is the new state being returned to caller (nextState)
  }
);

printDifference(state, next);
```

```
-----------------------------------------------
------------------- Results -------------------
  state: {
    deep: {
      foo: { ... Equal },
      set: Set {
        [add]    =  object { one: 'two' }
        [delete] =  object { one: 'two' }
        [delete] =  object { two: 'three' }
      },
      map: Map {
        [create] "YoYo" => (
          Type  =  undefined  --->  undefined
          Value =  undefined  --->  1
        ),
      },
      array: [
        0: { ... Equal },
        1: {
          i: number
          data: {
            one: (
              Type  =  undefined  --->  string
              Value =  undefined  --->  "two"
            ),
          },
        },
        2: {
          i: (
            Type  =  number  --->  number
            Value =  3  --->  8
          ),
        },
        3: { ... Equal },
        4: { ... Equal },
        5: {
          i: (
            Type  =  undefined  --->  number
            Value =  undefined  --->  6
          ),
          new: (
            Type  =  undefined  --->  string
            Value =  undefined  --->  "value"
          ),
        },
      ],
    },
  }
-----------------------------------------------
-----------------------------------------------
```
