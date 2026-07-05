import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';
import { Greeting } from './Greeting';
import { GamesCard } from './GamesCard';

interface ProfileRowProps {
  dateStr: string;
  onOpenGames: () => void;
}

export function ProfileRow({ dateStr, onOpenGames }: ProfileRowProps) {
  const { state } = useGravy();

  return (
    <div className="profile-row">
      <div className="profile-row-left">
        <div
          className="profile-avatar"
          aria-hidden="true"
          style={{ background: state.settings.avatarBgColor, color: state.settings.avatarIconColor }}
        >
          <AppIcon iconKey={state.settings.avatarIcon} emojiFallback="😊" />
        </div>
        <Greeting dateStr={dateStr} />
      </div>
      <GamesCard onOpen={onOpenGames} />
    </div>
  );
}
