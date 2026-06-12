import type { BadgeDef } from '../store/badges';

// Decouples the badge store from the unlock panel UI: the store announces,
// the host (mounted once in App) listens. Unlocks fired before the host
// mounts are buffered and flushed on subscribe, so nothing is lost during
// startup.

type Listener = (def: BadgeDef) => void;

let listener: Listener | null = null;
const buffer: BadgeDef[] = [];

export function notifyBadgeUnlock(def: BadgeDef): void {
  if (listener) listener(def);
  else buffer.push(def);
}

export function subscribeBadgeUnlocks(cb: Listener): () => void {
  listener = cb;
  while (buffer.length) cb(buffer.shift()!);
  return () => {
    if (listener === cb) listener = null;
  };
}
