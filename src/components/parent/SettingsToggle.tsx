interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Describes what is being switched, e.g. "Dynamic point weighting". Used as the accessible name. */
  label: string;
}

// The app's on/off control for parent panels. Built on the existing .btn variants rather than a
// custom switch: `aria-pressed` on a button is a well-supported toggle pattern, and it inherits the
// chunky border/hard-shadow press treatment every other control here already has.
//
// Plain onClick, not pressable() — per docs/ui-surfaces.md that wrapper is for home-screen controls
// inside the scroll area; parent panels use bare handlers.
export function SettingsToggle({ checked, onChange, label }: SettingsToggleProps) {
  return (
    <button
      type="button"
      className={`btn btn-sm ${checked ? 'btn-purple' : 'btn-ghost'}`}
      aria-pressed={checked}
      aria-label={`${label}: ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
    >
      {checked ? 'On' : 'Off'}
    </button>
  );
}
