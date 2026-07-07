interface SpotlightProps {
  // null = no target measured this step (e.g. the centered opening card) — render nothing.
  rect: DOMRect | null;
  padding?: number;
  radius?: number;
}

// Dependency-free "cutout" overlay: a fixed div sized to the target's rect with a giant spread
// box-shadow fills the rest of the viewport, leaving the target's own box visually transparent.
// With no target (the centered opening step), dim the whole screen instead — there's nothing to
// cut a hole around yet.
export function Spotlight({ rect, padding = 8, radius = 16 }: SpotlightProps) {
  if (!rect) return <div className="tour-spotlight tour-spotlight-full" />;
  return (
    <div
      className="tour-spotlight"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        borderRadius: radius,
      }}
    />
  );
}
