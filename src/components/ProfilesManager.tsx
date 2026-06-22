import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faPenToSquare, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import type { Theme } from '../state/types';
import { PinScreen } from './PinScreen';
import { AppIcon } from './AppIcon';
import { IconPicker } from './IconPicker';
import { ColorPicker, type ColorOption } from './ColorPicker';
import { AVATAR_ICONS } from '../data/icons';

type Stage = 'pin' | 'manage';

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'bubblegum', label: 'Bubblegum' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
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

interface ProfilesManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfilesManager({ open, onClose }: ProfilesManagerProps) {
  const { profiles, addProfile, updateProfile, deleteProfile } = useGravy();
  const [stage, setStage] = useState<Stage>('pin');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  // Bumped on every fresh open so <PinScreen key={pinNonce}> remounts — this manager stays
  // mounted at all times (visibility is CSS-only), so a stale instance would otherwise hold
  // its own lockout state from whenever it last mounted instead of the latest shared lockout.
  const [pinNonce, setPinNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage('pin');
      setEditingId(null);
      setConfirmDeleteId(null);
      setPinNonce((n) => n + 1);
    }
  }

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addProfile(name);
    setNewName('');
  };

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Profiles</span>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {stage === 'pin' ? (
            <PinScreen key={pinNonce} onSuccess={() => setStage('manage')} />
          ) : (
            <>
              <div className="section-label">Kids</div>
              {profiles.map((p) => (
                <div key={p.id} className="profile-manage-item">
                  <div className="parent-item">
                    <span
                      className="avatar-preview-circle"
                      style={{ background: p.avatarBgColor, color: p.avatarIconColor }}
                      aria-hidden="true"
                    >
                      <AppIcon iconKey={p.avatarIcon} emojiFallback="😊" />
                    </span>
                    <div className="parent-item-info">
                      <div className="parent-item-name">{p.name}</div>
                      <div className="parent-item-pts">{p.points} pts</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <FontAwesomeIcon icon={editingId === p.id ? faCheck : faPenToSquare} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-pink"
                      disabled={profiles.length <= 1}
                      onClick={() => setConfirmDeleteId(confirmDeleteId === p.id ? null : p.id)}
                      aria-label={`Delete ${p.name}`}
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>

                  {confirmDeleteId === p.id && (
                    <div className="profile-confirm-delete">
                      <span>Delete {p.name}? This erases their points &amp; history.</span>
                      <div className="profile-confirm-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-pink"
                          onClick={() => { deleteProfile(p.id); setConfirmDeleteId(null); setEditingId(null); }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {editingId === p.id && (
                    <div className="profile-edit-panel">
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => updateProfile(p.id, { childName: e.target.value })}
                        onBlur={(e) => updateProfile(p.id, { childName: e.target.value.trim() || 'Kid' })}
                      />
                      <div className="avatar-settings-row">
                        <IconPicker
                          value={p.avatarIcon}
                          icons={AVATAR_ICONS}
                          onChange={(key) => updateProfile(p.id, { avatarIcon: key })}
                          ariaLabel={`Choose ${p.name}'s avatar icon`}
                        />
                        <ColorPicker
                          value={p.avatarIconColor}
                          colors={AVATAR_COLORS}
                          disabledHex={p.avatarBgColor}
                          onChange={(hex) => updateProfile(p.id, { avatarIconColor: hex })}
                          ariaLabel="Choose icon color"
                        />
                        <ColorPicker
                          value={p.avatarBgColor}
                          colors={AVATAR_COLORS}
                          disabledHex={p.avatarIconColor}
                          onChange={(hex) => updateProfile(p.id, { avatarBgColor: hex })}
                          ariaLabel="Choose circle color"
                        />
                      </div>
                      <div className="theme-swatch-grid">
                        {THEME_OPTIONS.map((opt) => (
                          <button
                            type="button"
                            key={opt.id}
                            className={`theme-swatch ${p.theme === opt.id ? 'active' : ''}`}
                            aria-pressed={p.theme === opt.id}
                            onClick={() => updateProfile(p.id, { theme: opt.id })}
                          >
                            <span className={`theme-swatch-preview theme-swatch-preview--${opt.id}`} />
                            <span className="theme-swatch-label">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="section-label">Add a kid</div>
              <form
                className="input-row"
                onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
              >
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button type="submit" className="btn btn-sm btn-purple" disabled={!newName.trim()}>
                  <FontAwesomeIcon icon={faPlus} /> Add
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
