type UnauthorizedListener = () => void;

const listeners = new Set<UnauthorizedListener>();

export const emitUnauthorized = () => {
  listeners.forEach((listener) => listener());
};

export const onUnauthorized = (listener: UnauthorizedListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};