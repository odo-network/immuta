// crazy concept - almost certainly would never use it - but fun hacky
// concept

export function cloneFunction(Func, ...args) {
  function newThat(...args2) {
    return new Func(...args2);
  }
  function clone() {
    if (this instanceof clone) {
      return newThat(...args);
    }
    return Func.apply(this, args);
  }
  for (const key in Func) {
    if (Object.prototype.hasOwnProperty.call(Func, key)) {
      clone[key] = Func[key];
    }
  }
  Object.defineProperty(clone, 'name', { value: Func.name, configurable: true });
  return clone;
}
