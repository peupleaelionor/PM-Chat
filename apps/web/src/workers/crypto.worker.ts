/**
 * Web Worker for offloading heavy crypto operations from the main thread.
 * Currently a stub – the actual crypto runs on the main thread via Web Crypto API
 * (which is already non-blocking and hardware-accelerated in most browsers).
 * This worker can be used for CPU-intensive tasks like key derivation in the future.
 */

export {};

self.addEventListener('message', (event: MessageEvent<{ type: string; payload: unknown }>) => {
  const { type } = event.data;

  switch (type) {
    case 'ping':
      self.postMessage({ type: 'pong' });
      break;
    default:
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
  }
});
