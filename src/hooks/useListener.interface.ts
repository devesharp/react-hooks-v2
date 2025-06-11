export type IUnsubListener = () => void;

export type IUseListenerReturn<T> = [
   addEventListener: (v: (v?: T) => void) => IUnsubListener,
   setValue: (v?: T) => void,
];
