export type TypeName<T> =
  T extends string ? 'string' :
  T extends number ? 'number' :
  'unknown';
