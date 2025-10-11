import { useRef, useEffect } from 'react';

/**
 * @function
 * @name useDidUpdateEffect
 * @description A hook that calls function on component update or inputs change phase
 * @param fn
 * @param inputs
 */
export function useDidEffect(fn: () => void, inputs: unknown[]) {
  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current) fn();
    else didMountRef.current = true;
  }, inputs);

  return true;
};