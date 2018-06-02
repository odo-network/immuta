/* @flow */

/**
 * SetMap provides an extended Map which mixes in some extra commands.  The idea is
 * to use this when you need to manage a Map of Sets or Maps.  It provides various
 * prototype methods that make it easy to build these data structures.
 *
 * Map<any, Set<any> | Map<any, any> | any>
 * @extends {Map}
 */
export default class SetMap<K, V, V2 = empty> extends Map<K, Set<V> | Map<V, V2>> {
  /**
   * Adds values to the Set found at the given key.  If a Set does not yet exist, it
   * will automatically create one for you.
   *
   * @param {*} key key where the Set can be found
   * @param {...any[]} values Values to set on the Set
   * @returns {SetMap}
   * @memberof SetMap
   */
  add(key: K, ...values: V[]) {
    return this.addSet(key, ...values);
  }
  /**
   * Adds values to the Set found at the given key.  If a Set does not yet exist, it
   * will automatically create one for you.
   *
   * @param {*} key key where the Set can be found
   * @param {...any[]} values Values to set on the Set
   * @returns {SetMap}
   * @memberof SetMap
   */
  addSet(key: K, ...values: V[]) {
    let val = this.get(key);
    if (!val) {
      val = new Set();
      this.set(key, val);
    }
    if (!(val instanceof Set)) {
      throw new TypeError(`[SetMap] | addSet | ERROR | Expected ${String(key)} to be a Set`);
    }
    // need to stop Flow from being worried we will be re-assigning the value of `val`
    const set = val;
    values.forEach(v => set.add(v));
    return this;
  }
  /**
   * Adds values to the Map found at the given key.  If a Map does not yet exist, it
   * will automatically create one for you.
   *
   * @param {*} key key where the Map can be found
   * @param {any} mapKey Key to set on the Map found at `key`
   * @param {any} mapValue Value to set on the Map found at `key`
   * @returns {SetMap}
   * @memberof SetMap
   */
  addMap(key: K, mapKey: V, mapValue: V2) {
    let val;
    if (this.has(key)) {
      val = this.get(key);
      if (!(val instanceof Map)) {
        throw new TypeError(`[SetMap] | addMap | ERROR | Expected ${String(key)} to be a Map`);
      }
    } else {
      val = new Map();
      this.set(key, val);
    }
    val.set(mapKey, mapValue);
    return this;
  }

  /**
   * Gets a value on the map at key
   * @param {K} key
   * @param {V} value
   */
  getMap(key: K, value: V): void | V2 {
    const map = this.get(key);
    if (!map) return;
    if (!(map instanceof Map)) {
      throw new TypeError(`[SetMap] | getMap/getSet | ERROR | Expected ${String(key)} to be a Map`);
    }
    return map.get(value);
  }

  /**
   * Checks if all the given values exist on the key's Set or Map.  Returns a boolean
   * if all `values` match.
   *
   * @param {*} key key where the Map or Set can be found
   * @param {...any[]} values Value to check existence for
   * @returns {boolean}
   * @memberof SetMap
   */
  hasSet(key: K, ...args: V[]) {
    return this.hasMap(key, ...args);
  }
  /**
   * Checks if all the given values exist on the key's Set or Map.  Returns a boolean
   * if all `values` match.
   *
   * @param {*} key key where the Map or Set can be found
   * @param {...any[]} values Value to check existence for
   * @returns {boolean}
   * @memberof SetMap
   */
  hasMap(key: K, ...values: V[]): boolean {
    let val;
    if (this.has(key)) {
      val = this.get(key);
      if (!val || !(val instanceof Set || val instanceof Map)) {
        throw TypeError(`[SetMap] | hasMap/hasSet | ERROR | Expected ${String(key)} to be a Map or Set`);
      }
      return values.every(v => val && val.has(v));
    }
    return false;
  }
  /**
   * Get the size of a SetMap by its key.  Will provide the `.size` property of the Map or Set
   * at the given key.  If it doesn't exist, 0 will be returned.
   *
   * @param {*} key
   * @returns {number}
   * @memberof SetMap
   */
  sizeSet(key: K) {
    return this.sizeMap(key);
  }
  /**
   * Get the size of a SetMap by its key.  Will provide the `.size` property of the Map or Set
   * at the given key.  If it doesn't exist, 0 will be returned.
   *
   * @param {*} key
   * @returns {number}
   * @memberof SetMap
   */
  sizeMap(key: K) {
    let val;
    if (this.has(key)) {
      val = this.get(key);
      if (!(val instanceof Set || val instanceof Map)) {
        throw TypeError(`[SetMap] | sizeMap/sizeSet | ERROR | Expected ${String(key)} to be a Map or Set`);
      }
      return val.size;
    }
    return 0;
  }
  /**
   * Removes n number of values if they exist on the Map or Set.
   * Each value should be a key for Map or the value itself for
   * Sets.
   *
   * @param {Array<K | V>} args
   * @returns {SetMap}
   * @memberof SetMap
   */
  removeSet(key: K, ...args: V[]) {
    return this.remove(key, ...args);
  }
  /**
   * Removes n number of values if they exist on the Map or Set.
   * Each value should be a key for Map or the value itself for
   * Sets.
   *
   * @param {...any[]} args
   * @returns {SetMap}
   * @memberof SetMap
   */
  removeMap(key: K, ...args: V[]) {
    return this.remove(key, ...args);
  }
  /**
   * Removes n number of values if they exist on the Map or Set.
   * Each value should be a key for Map or the value itself for
   * Sets.
   *
   * @param {...any[]} args
   * @returns {SetMap}
   * @memberof SetMap
   */
  remove(key: K, ...values: V[]) {
    if (values.length && this.has(key)) {
      const val = this.get(key);
      if (val instanceof Set || val instanceof Map) {
        values.forEach(v => val.delete(v));
        if (val.size === 0) {
          this.delete(key);
        }
      } else {
        throw TypeError(`[SetMap] | remove | ERROR | Expected ${String(key)} to be a Set or Map`);
      }
    }
    return this;
  }
}
