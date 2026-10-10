/** Tiny change notifier so the search cache can be invalidated without import cycles. */
type Listener = () => void;
const listeners: Listener[] = [];
let version = 0;

export function onLocalityChanged() {
  version++;
  listeners.forEach(l => l());
}

export function subscribeLocality(l: Listener) {
  listeners.push(l);
}

export function localityVersion() {
  return version;
}
