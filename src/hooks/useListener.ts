import { useRef } from 'react';
import { IUnsubListener, IUseListenerReturn } from './useListener.interface';

export function useListener<T = unknown>(): IUseListenerReturn<T> {
   const id = useRef<number>(0);
   const events = useRef<Map<number, (resolves?: T) => void>>(new Map());

   function addEventListener(fn: (resolves?: T) => void): IUnsubListener {
      id.current += 1;
      const currentId = id.current;
      events.current.set(currentId, fn);

      return () => {
         events.current.delete(currentId);
      };
   }

   function setValue(v?: T): void {
      Array.from(events.current.values()).forEach((fn) => {
         try {
            fn(v);
         } catch (e) {
            console.error(e);
         }
      });
   }

   return [addEventListener, setValue];
}
