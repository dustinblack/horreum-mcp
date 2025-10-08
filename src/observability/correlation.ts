import { AsyncLocalStorage } from 'node:async_hooks';

type CorrelationStore = {
  reqId: string | null;
};

const storage = new AsyncLocalStorage<CorrelationStore>();

export function enterWithRequestId(reqId: string): void {
  const current = storage.getStore();
  if (current && current.reqId === reqId) return;
  storage.enterWith({ reqId });
}

export function runWithRequestId<T>(reqId: string, fn: () => T): T {
  return storage.run({ reqId }, fn);
}

export function getRequestId(): string | null {
  const store = storage.getStore();
  return store?.reqId ?? null;
}
