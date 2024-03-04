import { useCallback, useEffect, useState } from "react";

export function subscribe<S>(
  subbable: ReactiveValue<S>,
  cb: StateChangeHandler<S>
): () => void {
  subbable._subscriptors.add(cb);
  return () => subbable._subscriptors.delete(cb);
}

export function notify<S>(subbable: ReactiveValue<S>, value: S) {
  subbable._subscriptors.forEach((cb) => {
    cb(value);
  });
}

export type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
export type StateChangeHandler<S> = (value: S) => void;

/**
 * LinkedState is a Subbable, a single atomic primitive
 */
export class ReactiveValue<S> {
  private _value: Readonly<S>;
  _subscriptors: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this._value = initialValue;
  }

  static of<T>(val: T) {
    return new this<T>(val);
  }

  set(value: Readonly<S>): void {
    // performance.mark("0");
    this._value = value;
    notify(this, this._value);
    // performance.mark("1");
    // performance.measure("a", "0", "1");
  }

  setDyn(cb: (prevState: S) => S) {
    const newVal = cb(this.get());
    this.set(newVal);
  }

  get(): Readonly<S> {
    return this._value;
  }

  peek(): Readonly<S> {
    return this.get();
  }

  replace(value: Readonly<S>): void {
    this.set(value);
  }
}

export function useReactive<S>(rv: ReactiveValue<S>): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(() => rv.get());

  useEffect(() => {
    return subscribe(rv, () => {
      setState(() => rv.get());
    });
  }, [rv]);

  const apiState = rv.get();
  useEffect(() => {
    setState(() => apiState);
  }, [apiState]);

  const setter: StateDispath<S> = useCallback(
    (newVal) => {
      // newVal instanceof Function
      if (newVal instanceof Function) {
        rv.set(newVal(rv.get()));
      } else {
        rv.set(newVal);
      }
    },
    [rv]
  );

  return [state, setter];
}
