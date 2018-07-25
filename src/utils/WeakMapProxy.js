/* @flow */

/**
 * In order to provide support for WeakMap's we need to build a special
 * proxy object which is returned in the place of the standard WeakMap
 * which maintains the "cloned" version of the WeakMap and is able to
 * properly provide the desired results.
 *
 * We use WeakMap and WeakSet to implement this in a way that has identical
 * properties when it comes to reference handling and extend the native
 * WeakMap so that calls such as `instanceof WeakMap` remain as expected.
 */
export default class WeakMapProxy extends WeakMap<*, *> {
  #original;

  #proxy;

  #removed;

  constructor(original: WeakMap<*, *>) {
    super();
    this.#original = original;
    this.#proxy = new WeakMap();
    this.#removed = new WeakSet();
  }

  get = (key: Object) => {
    if (this.#proxy.has(key)) {
      return this.#proxy.get(key);
    }
    if (!this.#removed.has(key)) {
      return this.#original.get(key);
    }
  };

  set = <K: Object, V>(key: K, value: V) => {
    if (this.#removed.has(key)) {
      this.#removed.delete(key);
    }
    this.#proxy.set(key, value);
    return this;
  };

  has = <K: Object>(key: K) => {
    if (this.#proxy.has(key)) {
      return true;
    }
    if (!this.#removed.has(key)) {
      return this.#original.has(key);
    }
    return false;
  };

  delete = <K: Object>(key: K) => {
    this.#removed.add(key);
    return this.#proxy.delete(key);
  };
}
