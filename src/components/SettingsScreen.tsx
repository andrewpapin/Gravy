import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import type { Theme } from '../state/types';
import { AppIcon } from './AppIcon';
import { IconPicker } from './IconPicker';
import { ColorPicker, type ColorOption } from './ColorPicker';
import { AVATAR_ICONS } from '../data/icons';

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'gold', label: 'Gold' },
];

const AVATAR_COLORS: ColorOption[] = [
  { hex: '#2F3E46', label: 'Charcoal' },
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#F28482', label: 'Coral' },
  { hex: '#F6BD60', label: 'Yellow' },
  { hex: '#84A59D', label: 'Sage' },
  { hex: '#D4AF37', label: 'Gold' },
  { hex: '#8EC5F6', label: 'Sky blue' },
  { hex: '#B388EB', label: 'Lavender' },
  { hex: '#F4A6C6', label: 'Pink' },
  { hex: '#FF8C42', label: 'Orange' },
  { hex: '#6FCF97', label: 'Green' },
  { hex: '#161B1F', label: 'Black' },
];

interface SettingsScreenProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsScreen({ open, onClose }: SettingsScreenProps) {
  const { state, saveSetting } = useGravy();
  const [childName, setChildName] = useState(state.settings.childName);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Settings</span>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close settings" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          <div className="section-label">Appearance</div>
          <div className="settings-row settings-row--col">
            <div>
              <div className="settings-label">
                Theme
                {savedField === 'theme' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">Changes the look of the app for everyone</div>
            </div>
            <div className="theme-swatch-grid">
              {THEME_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={`theme-swatch ${state.settings.theme === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    saveSetting('theme', opt.id);
                    flashSaved('theme');
                  }}
                  aria-pressed={state.settings.theme === opt.id}
                >
                  <span className={`theme-swatch-preview theme-swatch-preview--${opt.id}`} />
                  <span className="theme-swatch-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">Avatar</div>
          <div className="settings-row settings-row--col">
            <div>
              <div className="settings-label">
                Icon &amp; colors
                {savedField === 'avatar' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">Shows in the top bar</div>
            </div>
            <div className="avatar-settings-row">
              <span
                className="avatar-preview-circle"
                style={{ background: state.settings.avatarBgColor, color: state.settings.avatarIconColor }}
                aria-hidden="true"
              >
                <AppIcon iconKey={state.settings.avatarIcon} emojiFallback="😊" />
              </span>
              <IconPicker
                value={state.settings.avatarIcon}
                icons={AVATAR_ICONS}
                onChange={(key) => { saveSetting('avatarIcon', key); flashSaved('avatar'); }}
                ariaLabel="Choose your avatar icon"
              />
              <ColorPicker
                value={state.settings.avatarIconColor}
                colors={AVATAR_COLORS}
                disabledHex={state.settings.avatarBgColor}
                onChange={(hex) => { saveSetting('avatarIconColor', hex); flashSaved('avatar'); }}
                ariaLabel="Choose your icon color"
              />
              <ColorPicker
                value={state.settings.avatarBgColor}
                colors={AVATAR_COLORS}
                disabledHex={state.settings.avatarIconColor}
                onChange={(hex) => { saveSetting('avatarBgColor', hex); flashSaved('avatar'); }}
                ariaLabel="Choose your circle color"
              />
            </div>
          </div>
          <div className="section-label">Profile</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">
                Child's name
                {savedField === 'childName' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">Shown throughout the app</div>
            </div>
            <input
              type="text"
              maxLength={20}
              placeholder="Zack"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onBlur={(e) => {
                // saveSetting trims and falls back to a default for empty input — mirror that
                // here so the field never shows blank while state holds the fallback name.
                const effective = e.target.value.trim() || 'Zack';
                saveSetting('childName', effective);
                setChildName(effective);
                flashSaved('childName');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
