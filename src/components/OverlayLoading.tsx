// Suspense fallback for the lazily-loaded full-screen overlays reached from the home screen
// (Prizes / Stats / Daily). Without it those Suspense boundaries fall back to `null`, so a cold
// tap on one of the quick-link pills produces no response at all until the chunk downloads and
// reads as an ignored tap. Reuses the drawer scrim so it lands where the real screen will.
export function OverlayLoading() {
  return (
    <div className="calendar-modal-overlay overlay-loading show" role="status" aria-label="Loading" aria-live="polite">
      <div className="overlay-loading-spinner" aria-hidden="true" />
    </div>
  );
}
