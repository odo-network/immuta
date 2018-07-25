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

#### mergeWithDraft `export`

##### Summary

`mergeWithDraft` provides a way of doing more complex merges that may be necessary without hurting performance as much as manually iterating through all the layers of Proxies that would need to be generated.

This can get especially expensive when the merge ends up not making changes to the final result. With `mergeWithDraft`, we iterate the source and target values directly and only grab from the Proxy when and if needed. This provides near-native performance on merges that would otherwise require a significant amount of proxy generation.

`mergeWithDraft` has various properties added to it which allows configuring the merge that will occur.

- `mergeWithDraft` - Deep merge draft with another object
- `mergeWithDraft.at` - Deep merge at a given path
- `mergeWithDraft.deep` - Alias to `mergeWithDraft`
- `mergeWithDraft.deep.at` - Alias to `mergeWithDraft.at`
- `mergeWithDraft.shallow` - Shallow merge draft with another object
- `mergeWithDraft.shallow.at` - Shallow merge draft with another object at a given path.

> **Important**: At the moment `Set` merging may not work as one might generally expect. At this time it will always add the new value to the set if not included in the original set. We explored many options here but it doesn't really seem possible to do any kind of deep merge with `Set` in any expected way with how they work in the end. Happy to discuss if you open an issue and see if we can come up with a good solution!

##### Type Signatures

`mergeWithDraft` has two function type signatures. Direct merge and path-based (at) merging.

```javascript
type MergeWithDraft = (draft: Immuta$Draft, ...targets: any[]) => void;

type MergeWithDraftAt = (
  draft: Immuta$Draft,
  path: Immuta$MergePath,
  ...targets: any[]
) => void;
```

##### Example

```javascript
import immuta, { mergeWithDraft } from "immuta";
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
  draft => {
    mergeWithDraft(draft, {
      deep: {
        foo: {
          bar: {
            foo: true
          }
        },
        set: new Set([{ three: "four" }]),
        map: new Map([["one", { bar: "baz" }]]),
        array: [{ foo: "bar" }]
      }
    });
    mergeWithDraft.at(draft, "deep.array.3.deeper.path.than.it.had", {
      at: "merge"
    });

    const objKey = { object: "key" };

    mergeWithDraft.at(draft, ["deep", "map", objKey, "also", "works"], {
      foo: "bar"
    });

    // we can also do some crazy type check voodoo along the way which can also
    // hint what types to create if they dont exist yet
    mergeWithDraft.at(
      draft,
      [
        "deep",
        "map",
        objKey,
        [Map, "map2"],
        objKey,
        "more",
        [Array, "array"],
        0
      ],
      {
        wait: "what?"
      }
    );
  },
  (changedState, changedMap, rollback) => {
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
Change:  [ 'deep', 'foo' ]
Change:  [ 'deep', 'foo', 'bar' ]
Change:  [ 'deep', 'foo', 'bar', 'foo' ]
Change:  [ 'deep', 'set' ]
Change:  [ 'deep', 'map' ]
Change:  [ 'deep', 'map', 'one' ]
Change:  [ 'deep', 'map', 'one', 'bar' ]
Change:  [ 'deep', 'array' ]
Change:  [ 'deep', 'array', '0' ]
Change:  [ 'deep', 'array', '0', 'foo' ]
Change:  [ 'deep', 'array', '3' ]
Change:  [ 'deep', 'array', '3', 'deeper' ]
Change:  [ 'deep', 'array', '3', 'deeper', 'path' ]
Change:  [ 'deep', 'array', '3', 'deeper', 'path', 'than' ]
Change:  [ 'deep', 'array', '3', 'deeper', 'path', 'than', 'it' ]
Change:  [ 'deep', 'array', '3', 'deeper', 'path', 'than', 'it', 'had' ]
Change:  [ 'deep', 'map', { object: 'key' } ]
Change:  [ 'deep', 'map', { object: 'key' }, 'also' ]
Change:  [ 'deep', 'map', { object: 'key' }, 'also', 'works' ]
Change:  [ 'deep', 'map', { object: 'key' }, 'map2' ]
Change:  [ 'deep', 'map', { object: 'key' }, 'map2', { object: 'key' } ]
Change:  [ 'deep',
  'map',
  { object: 'key' },
  'map2',
  { object: 'key' },
  'more' ]
Change:  [ 'deep',
  'map',
  { object: 'key' },
  'map2',
  { object: 'key' },
  'more',
  'array' ]
Change:  [ 'deep',
  'map',
  { object: 'key' },
  'map2',
  { object: 'key' },
  'more',
  'array',
  0 ]
-----------------------------------------------
------------------- Results -------------------
  state: {
    deep: {
      foo: {
        bar: {
          baz: boolean
          foo: (
            Type  =  undefined  --->  "boolean"
            Value =  undefined  --->  true
          ),
        },
      },
      set: Set {
        [add]    =  object { three: 'four' }
      },
      map: Map {
        [change] "one" => (
          Type  =  object  --->  object
          Value =  [object Object]  --->  [object Object]
          {
            foo: string
            bar: (
              Type  =  undefined  --->  string
              Value =  undefined  --->  "baz"
            ),
          }
        ),
        [create] "{"object":"key"}" => (
          Type  =  undefined  --->  object
          Value =  undefined  --->  [object Object]
          {
            also: {
              works: {
                foo: (
                  Type  =  undefined  --->  string
                  Value =  undefined  --->  "bar"
                ),
              },
            },
            map2: Map {
              [create] "{"object":"key"}" => (
                Type  =  undefined  --->  object
                Value =  undefined  --->  [object Object]
                {
                  more: {
                    array: [
                      0: {
                        wait: (
                          Type  =  undefined  --->  string
                          Value =  undefined  --->  "what?"
                        ),
                      },
                    ],
                  },
                }
              ),
            },
          }
        ),
      },
      array: [
        0: {
          i: number
          foo: (
            Type  =  undefined  --->  string
            Value =  undefined  --->  "bar"
          ),
        },
        1: { ... Equal },
        2: { ... Equal },
        3: {
          i: number
          deeper: {
            path: {
              than: {
                it: {
                  had: {
                    at: (
                      Type  =  undefined  --->  string
                      Value =  undefined  --->  "merge"
                    ),
                  },
                },
              },
            },
          },
        },
        4: { ... Equal },
      ],
    },
  }
-----------------------------------------------
-----------------------------------------------
```

```javascript
// Stringified final value
{
  "deep": {
    "foo": {
      "bar": {
        "baz": true,
        "foo": true
      }
    },
    "set": [
      {
        "one": "two"
      },
      {
        "two": "three"
      },
      {
        "three": "four"
      }
    ],
    "map": [
      [
        "one",
        {
          "foo": "bar",
          "bar": "baz"
        }
      ],
      [
        {
          "object": "key"
        },
        {
          "also": {
            "works": {
              "foo": "bar"
            }
          },
          "map2": [
            [
              {
                "object": "key"
              },
              {
                "more": {
                  "array": [
                    {
                      "wait": "what?"
                    }
                  ]
                }
              }
            ]
          ]
        }
      ]
    ],
    "array": [
      {
        "i": 1,
        "foo": "bar"
      },
      {
        "i": 2
      },
      {
        "i": 3
      },
      {
        "i": 4,
        "deeper": {
          "path": {
            "than": {
              "it": {
                "had": {
                  "at": "merge"
                }
              }
            }
          }
        }
      },
      {
        "i": 5
      }
    ]
  }
}
```
