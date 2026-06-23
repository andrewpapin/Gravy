import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { GAMES } from '../data/games';
import { useGravy, DAILY_GAME_WIN_CAP } from '../state/GravyContext';
import { HangmanGame } from './games/HangmanGame';
import { MathFactsGame } from './games/MathFactsGame';
import { WordScrambleGame } from './games/WordScrambleGame';
import { MemoryMatchGame } from './games/MemoryMatchGame';
import { useFocusTrap } from './useFocusTrap';

interface GamesScreenProps {
  open: boolean;
  onClose: () => void;
}

export function GamesScreen({ open, onClose }: GamesScreenProps) {
  const { state } = useGravy();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const winsMaxed = state.todayGameWins >= DAILY_GAME_WIN_CAP;

  const handleClose = () => {
    onClose();
    setActiveGame(null);
  };

  const activeGameDef = GAMES.find((g) => g.id === activeGame);
  const sheetRef = useFocusTrap<HTMLDivElement>(open, handleClose);

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="calendar-modal-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={activeGameDef ? activeGameDef.name : 'Games'}
        tabIndex={-1}
      >
        <div className="calendar-modal-header">
          <div className="calendar-modal-header-titles">
            {activeGameDef && (
              <button className="calendar-modal-back" onClick={() => setActiveGame(null)} aria-label="Back to Games" type="button">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}
            <span className="calendar-modal-title">{activeGameDef ? activeGameDef.name : 'Games'}</span>
          </div>
          <button className="calendar-modal-close" onClick={handleClose} aria-label="Close games" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {activeGame === 'hangman' ? (
            <HangmanGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'mathfacts' ? (
            <MathFactsGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'scramble' ? (
            <WordScrambleGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'memory' ? (
            <MemoryMatchGame onExit={() => setActiveGame(null)} />
          ) : (
            <>
              <div className={`games-cap-banner ${winsMaxed ? 'maxed' : ''}`}>
                <AppIcon iconKey="gamepad" emojiFallback="🎮" />
                <span>
                  {winsMaxed
                    ? "Today's game points are maxed — keep playing for fun!"
                    : `${state.todayGameWins}/${DAILY_GAME_WIN_CAP} wins earn points today`}
                </span>
              </div>
              <div className="games-grid">
                {GAMES.map((g) => (
                  <button key={g.id} className="game-tile" onClick={() => setActiveGame(g.id)} type="button">
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="game-tile-icon" />
                    <div className="game-tile-name">{g.name}</div>
                    <div className="game-tile-desc">{g.description}</div>
                    <span className="pts-badge game-tile-pts">+{g.pts ?? state.settings.gamePts} pts</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
