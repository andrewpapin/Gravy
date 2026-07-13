import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';
import { RELEASE_NOTES } from '../data/releaseNotes';
import { getLatestReleaseNoteVersion, getUnseenReleaseNotes } from '../state/releaseNotes';
import { safeGetItem, safeSetItem } from '../state/storage';

const RELEASE_NOTES_SEEN_KEY = 'gravy_release_notes_seen';

function readLastSeenVersion(): number | null {
  const raw = safeGetItem(RELEASE_NOTES_SEEN_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReleaseNotesDrawer() {
  const [notes] = useState(() => getUnseenReleaseNotes(RELEASE_NOTES, readLastSeenVersion()));
  const [open, setOpen] = useState(notes.length > 0);

  // Mark the latest version seen as soon as we've decided whether to show it — covers both a
  // brand-new install (nothing to show, just start tracking) and an update (shown now, so it
  // won't reappear next load).
  useEffect(() => {
    safeSetItem(RELEASE_NOTES_SEEN_KEY, String(getLatestReleaseNoteVersion(RELEASE_NOTES)));
  }, []);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      closeLabel="Close what's new"
      overlayClassName="release-notes-overlay"
      title={
        <span className="release-notes-title">
          <FontAwesomeIcon icon={faBullhorn} /> What&apos;s New
        </span>
      }
    >
      <ul className="release-notes-list">
        {notes.map((n) => (
          <li key={n.version}>
            {n.note}
            <div className="release-notes-date">{new Date(n.at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
