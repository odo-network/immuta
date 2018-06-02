## Immuta

Immuta is the son of Immer, a simple immutable library. Immuta was born out of the desire to build a state management & subscription system for React that could be far more efficient than current solutions. It provides the ability to receive the exact values within your state that were changed on each mutation while remaining performant and lean.

### Reference

#### immuta `default export`

##### Example

```javascript
import immuta from "immuta";

const state = {
  foo: "bar"
};

const nextState = immuta(
  // provide the state to start with
  state,
  // draft is a proxy that will copy-on-write
  draft => {
    draft.foo = "baz";
  },
  // optional callback for change events
  (changedState, changedMap, rollback) => {
    // rollback() will cancel the changes and return original object
    // changedMap is Map { ['path.to.change']: changedValue }
    // changedState is the new state being returned to caller (nextState)
  }
);

console.log(nextState === state); // false
```
