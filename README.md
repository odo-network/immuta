## Immuta

Immuta is the son of Immer, a simple immutable library. Immuta was born out of the desire to build a state management & subscription system for React that could be far more efficient than current solutions. It provides the ability to receive the exact values within your state that were changed on each mutation while remaining performant and lean.

> This library is **heavily** inspired by the awesome [immer](https://github.com/mweststrate/immer) library. It adds the "onChange" handler, rollbacks, change snapshots, and support for ES6 Maps & Sets. Most of these changes were built to provide a performant and flexible state management library when used in conjunction with [state-modules](https://github.com/odo-network/state-modules).

> `immuta` should provide a 1-to-1 compatible API with `immer` and can be dropped-in by simply changing the import.

### Installation

```
yarn add immuta
```

**or**

```
npm i --save immuta
```

### Flow Coverage

This library aims to provide 100% FlowType Coverage. We provide `.flow.js` files alongside each dist file.

> At this time the FlowTyping may be off a bit due to recent refactoring.

### Performance

While detailed tests need to be established, initial results show that `immuta` will perform closely with `immer` dependent on the complexity of the modifications. `immuta` seems to gain performance on larger/more complex datasets.

### Reference

#### immuta `default export`

##### Example

```javascript
import immuta from "immuta";
import printDifference from "immuta/utils/print-difference";

const state = {
  deep: {
    foo: {
      bar: {
        baz: true
      }
    },
    set: new Set([{ one: "two" }, { two: "three" }]),
    map: new Map([["one", { foo: "bar" }]]),
    array: [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }, { i: 5 }]
  }
};

const next = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    const one = draft.deep.map.get("one");
    if (one) {
      one.foo = 1;
    }
    draft.deep.set.clear();
    draft.deep.set.add({ some: "obj" });

    draft.deep.array[2].foo = "bar!";
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { ['path', 'to', 'change'] => changedValue }
    //  * Note that each value or reference that is changed will have an entry in the map
    // changedState is the new state being returned to caller (nextState)
    changedMap.forEach((v, changedKey) => {
      console.log("Change: ", changedKey);
    });
  }
);

printDifference(state, next);
```

```javascript
// Results
Change:  [ 'deep' ]
Change:  [ 'deep', 'map' ]
Change:  [ 'deep', 'map', 'one' ]
Change:  [ 'deep', 'map', 'one', 'foo' ]
Change:  [ 'deep', 'set' ]
Change:  [ 'deep', 'array' ]
Change:  [ 'deep', 'array', '2' ]
Change:  [ 'deep', 'array', '2', 'foo' ]
-----------------------------------------------
------------------- Results -------------------
  state: {
    deep: {
      foo: { ... Equal },
      set: Set {
        [add]    =  object { some: 'obj' }
        [delete] =  object { one: 'two' }
        [delete] =  object { two: 'three' }
      },
      map: Map {
        [change] "one" => (
          Type  =  object  --->  object
          Value =  [object Object]  --->  [object Object]
          {
            foo: (
              Type  =  string  --->  number
              Value =  "bar"  --->  1
            ),
          }
        ),
      },
      array: [
        0: { ... Equal },
        1: { ... Equal },
        2: {
          i: number
          foo: (
            Type  =  undefined  --->  string
            Value =  undefined  --->  "bar!"
          ),
        },
        3: { ... Equal },
        4: { ... Equal },
      ],
    },
  }
-----------------------------------------------
-----------------------------------------------
```

> `printDifference` is a utility library that was written to ensure references and values are changing as expected while testing. It can be used in your projects if you find it useful :)
