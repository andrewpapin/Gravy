// Tracks when anything on the page last scrolled, so `pressable` can tell a real tap apart from
// a flick (or from the tap that halts iOS momentum scrolling).
//
// A module-level timestamp plus one global listener rather than context/state: this is read
// inside pointer handlers on every control on the page, and it must never trigger a re-render.

let lastScroll = 0;

function record(): void {
  lastScroll = Date.now();
}

// Capture phase on `document`, which sees scroll from *any* scroller. That generality is the
// point: `.screen` is `min-height: 100dvh`, so the home screen's content is tall enough that the
// document itself scrolls rather than `.scroll-area` — a listener bound to `.scroll-area` alone
// would never fire.
if (typeof document !== 'undefined') {
  document.addEventListener('scroll', record, { capture: true, passive: true });
}

/** Timestamp (ms) of the most recent scroll, or 0 if nothing has scrolled yet this session. */
export function lastScrollAt(): number {
  return lastScroll;
}
