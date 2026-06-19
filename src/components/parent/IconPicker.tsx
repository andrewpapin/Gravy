import { useState } from 'react';
import { AppIcon } from '../AppIcon';
import { PICKER_ICONS } from '../../data/icons';

interface IconPickerProps {
  /** Currently selected icon key. */
  value?: string;
  /** Legacy emoji to show in the trigger when `value` is an unknown/legacy key. */
  legacyEmoji?: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

/**
 * Tap-to-pick grid of curated icons, replacing the old free-text emoji input in the
 * parent dashboard. The trigger shows the current selection (falling back to a legacy
 * emoji for un-migrated items); tapping opens a grid of `PICKER_ICONS`.
 */
export function IconPicker({ value, legacyEmoji, onChange, ariaLabel = 'Choose an icon' }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="icon-picker">
      <button
        type="button"
        className="icon-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <AppIcon iconKey={value} emojiFallback={legacyEmoji || '❓'} />
      </button>
      {open && (
        <>
          <div className="icon-picker-backdrop" onClick={() => setOpen(false)} />
          <div className="icon-picker-pop" role="listbox" aria-label={ariaLabel}>
            <div className="icon-picker-grid">
              {PICKER_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic.key}
                  className={`icon-picker-cell ${value === ic.key ? 'active' : ''}`}
                  onClick={() => {
                    onChange(ic.key);
                    setOpen(false);
                  }}
                  title={ic.label}
                  aria-label={ic.label}
                  aria-selected={value === ic.key}
                  role="option"
                >
                  <AppIcon iconKey={ic.key} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
