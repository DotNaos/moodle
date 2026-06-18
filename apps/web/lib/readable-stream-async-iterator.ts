export function ensureReadableStreamAsyncIterator(): void {
  if (typeof ReadableStream === "undefined") {
    return;
  }

  const proto = ReadableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: unknown;
    values?: unknown;
  };
  if (typeof proto[Symbol.asyncIterator] === "function") {
    return;
  }

  function values(this: ReadableStream<unknown>, options: { preventCancel?: boolean } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) {
            reader.releaseLock();
          }
          return result;
        } catch (error) {
          reader.releaseLock();
          throw error;
        }
      },
      async return(value?: unknown) {
        if (options.preventCancel) {
          reader.releaseLock();
        } else {
          const cancelled = reader.cancel(value);
          reader.releaseLock();
          await cancelled;
        }
        return { done: true as const, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  proto.values = values;
  proto[Symbol.asyncIterator] = values;
}
