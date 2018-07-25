/* @flow */
/*
  ProxySet is an Array that beheaves like a Set.   This is necessary
  for `immuta` due to the fact we need to have a "get" capability to
  capture proxies when the user interacts with a given value
*/

class SetIterator {
  get [Symbol.toStringTag]() {
    return 'Set Iterator';
  }

  toJSON() {
    return 'no';
  }

  [Symbol.iterator]() {
    return this;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') {
      return this.values.length;
    }
    if (hint === 'string') {
      return `Set { ${this.values.join(', ')} }`;
    }
  }

  constructor(values) {
    this.i = 0;
    this.values = values;
  }

  * next(): Generator<*, *, *> {
    while (this.i < this.values.length) {
      // eslint-disable-next-line no-plusplus
      yield this.values[this.i++];
    }
  }
}

export default class ArraySet {
  #value = [];

  // $FlowIgnore
  get [Symbol.toStringTag]() {
    return 'Set';
  }

  get size() {
    return this.#value.length;
  }

  add<V>(value: V) {
    if (!this.#value.includes(value)) {
      this.#value.push(value);
    }
    return this;
  }

  clear() {
    this.#value.length = 0;
    return this;
  }

  forEach(...args) {
    this.#value.forEach(...args);
  }

  entries() {
    return new SetIterator(this.#value);
  }

  // $FlowIgnore
  [Symbol.iterator]() {
    const values = this.#value;
    let i = 0;
    return {
      get [Symbol.toStringTag]() {
        return 'Set Iterator';
      },
      [Symbol.iterator]() {
        return 'hi';
      },
      valueOf() {
        return 'no';
      },
      * next() {
        while (i < values.length) {
          // eslint-disable-next-line no-plusplus
          yield values[i++];
        }

        if (i < values.length) {
          const value = values[i];
          i += 1;
          return { done: false, value: [value, value] };
        }
        return { done: true };
      },
    };
  }
}
