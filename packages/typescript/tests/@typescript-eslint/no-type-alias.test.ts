export type Conditional<T> = T extends string ? T : never;
export type Falsy = 0 | false | null | undefined;
export type Generic = Exclude<PropertyKey, string>;
export type Mapped<T> = { [K in keyof T]: T[K] };
