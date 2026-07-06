// Which side of a spotlighted target the callout should sit on, so it never covers its own
// target. Kept in its own module (not HomeTour.tsx) since a file exporting both a component and
// a plain function breaks fast refresh.
export function placementFor(rect: DOMRect): 'above' | 'below' {
  const targetMid = rect.top + rect.height / 2;
  return targetMid > window.innerHeight / 2 ? 'above' : 'below';
}
