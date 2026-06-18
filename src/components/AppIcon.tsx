import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { resolveIcon } from '../data/icons';

interface AppIconProps {
  /** Registered icon key (see data/icons.ts). */
  iconKey?: string;
  /** Legacy emoji string rendered when iconKey is unknown/absent. */
  emojiFallback?: string;
  className?: string;
  /** Hide from screen readers (icons are decorative when a text label is present). */
  ariaHidden?: boolean;
}

/**
 * Renders a FontAwesome icon for a known key, otherwise falls back to rendering the
 * raw legacy emoji string. The wrapper preserves the caller's sizing class either way,
 * so pre-existing emoji data (e.g. parent-created goals/rewards synced from another
 * device) keeps rendering at the right size until it's upgraded to an icon.
 */
export function AppIcon({ iconKey, emojiFallback, className, ariaHidden = true }: AppIconProps) {
  const def = resolveIcon(iconKey);
  if (def) {
    return <FontAwesomeIcon icon={def} className={className} aria-hidden={ariaHidden} />;
  }
  return (
    <span className={className} aria-hidden={ariaHidden}>
      {emojiFallback ?? ''}
    </span>
  );
}
