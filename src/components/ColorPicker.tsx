import { useState } from 'react';

export interface ColorOption {
  hex: string;
  label: string;
}

interface ColorPickerProps {
  /** Currently selected hex color. */
  value: string;
  /** Curated hex palette to offer. */
  colors: ColorOption[];
  onChange: (hex: string) => void;
  ariaLabel?: string;
}

/**
 * Tap-to-pick grid of curated hex colors, mirroring IconPicker's popover interaction.
 * Uses a fixed palette rather than a native color input to match the app's kid-friendly
 * curated-swatch aesthetic (see the theme-swatch-grid in SettingsScreen).
 */
export function ColorPicker({ value, colors, onChange, ariaLabel = 'Choose a color' }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="color-picker">
      <button
        type="button"
        className="color-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="color-picker-trigger-swatch" style={{ background: value }} />
      </button>
      {open && (
        <>
          <div className="icon-picker-backdrop" onClick={() => setOpen(false)} />
          <div className="color-picker-pop" role="listbox" aria-label={ariaLabel}>
            <div className="color-picker-grid">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  className={`color-picker-cell ${value === c.hex ? 'active' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => {
                    onChange(c.hex);
                    setOpen(false);
                  }}
                  title={c.label}
                  aria-label={c.label}
                  aria-selected={value === c.hex}
                  role="option"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
