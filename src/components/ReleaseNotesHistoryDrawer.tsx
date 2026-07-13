import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';
import { RELEASE_NOTES } from '../data/releaseNotes';
import { getAllReleaseNotesSorted } from '../state/releaseNotes';

interface ReleaseNotesHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function ReleaseNotesHistoryDrawer({ open, onClose, onBack }: ReleaseNotesHistoryDrawerProps) {
  const notes = getAllReleaseNotesSorted(RELEASE_NOTES);

  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onBack}
      closeLabel="Close release notes"
      title={
        <span className="release-notes-title">
          <FontAwesomeIcon icon={faBullhorn} /> Release Notes
        </span>
      }
    >
      <ul className="release-notes-list release-notes-history-list">
        {notes.map((n) => (
          <li key={n.version}>
            {n.note}
            <div className="release-notes-date">{new Date(n.at).toLocaleString()}</div>
            <a
              className="release-notes-history-link"
              href={`https://github.com/andrewpapin/gravy/pull/${n.prNumber}`}
              target="_blank"
              rel="noreferrer"
            >
              View PR #{n.prNumber}
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
