const identity = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
};

const chalkProxy = new Proxy(identity, {
  apply: (_target, _thisArg, args: unknown[]) => identity(args[0]),
  get: () => identity,
});

export default chalkProxy;
export const blue = identity;
export const gray = identity;
export const green = identity;
export const red = identity;
export const yellow = identity;
