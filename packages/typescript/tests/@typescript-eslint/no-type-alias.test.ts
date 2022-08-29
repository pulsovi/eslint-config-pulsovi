export type Generic = Exclude<PropertyKey, string>;
export type Mapped<T> = { [K in keyof T]: T[K] };
