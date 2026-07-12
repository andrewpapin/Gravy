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
import { RollToTheGoalGame } from './games/RollToTheGoalGame';
import { useFocusTrap } from './useFocusTrap';

interface GamesScreenProps {
  open: boolean;
  onClose: () => void;
}

export function GamesScreen({ open, onClose }: GamesScreenProps) {
  const { state } = useGravy();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const winsMaxed = state.todayGameWins >= DAILY_GAME_WIN_CAP;

  // Whether the active game reports an attempt in progress (dice rolled, not yet submitted) —
  // only Roll to the Goal uses this today, since it's the only game whose progress the kid
  // could lose by backing out mid-attempt via the chevron/close buttons below (every other game
  // only exposes its own "Back to Arcade" from inside a completed-round result panel).
  const [gameAttemptActive, setGameAttemptActive] = useState(false);
  const [exitConfirmPending, setExitConfirmPending] = useState<null | 'back' | 'close'>(null);

  // Every place that changes which game is showing goes through this, so gameAttemptActive/
  // exitConfirmPending never carry over between games (replaces a reset-on-change effect, which
  // would call setState synchronously inside useEffect).
  const goToGame = (id: string | null) => {
    setActiveGame(id);
    setGameAttemptActive(false);
    setExitConfirmPending(null);
  };

  const handleClose = () => {
    onClose();
    goToGame(null);
  };

  const requestExit = (kind: 'back' | 'close') => {
    if (gameAttemptActive) {
      setExitConfirmPending(kind);
      return;
    }
    if (kind === 'back') goToGame(null);
    else handleClose();
  };

  const confirmExit = () => {
    const kind = exitConfirmPending;
    if (kind === 'back') goToGame(null);
    else if (kind === 'close') handleClose();
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
        aria-label={activeGameDef ? activeGameDef.name : 'Arcade'}
        tabIndex={-1}
      >
        <div className="calendar-modal-header">
          <div className="calendar-modal-header-titles">
            {activeGameDef && (
              <button className="calendar-modal-back" onClick={() => requestExit('back')} aria-label="Back to Arcade" type="button">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}
            <span className="calendar-modal-title">{activeGameDef ? activeGameDef.name : 'Arcade'}</span>
          </div>
          <button className="calendar-modal-close" onClick={() => requestExit('close')} aria-label="Close arcade" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {activeGame === 'hangman' ? (
            <HangmanGame onExit={() => goToGame(null)} />
          ) : activeGame === 'mathfacts' ? (
            <MathFactsGame onExit={() => goToGame(null)} />
          ) : activeGame === 'scramble' ? (
            <WordScrambleGame onExit={() => goToGame(null)} />
          ) : activeGame === 'memory' ? (
            <MemoryMatchGame onExit={() => goToGame(null)} />
          ) : activeGame === 'rollgoal' ? (
            <RollToTheGoalGame onExit={() => goToGame(null)} onAttemptActiveChange={setGameAttemptActive} />
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
                  <button key={g.id} className="game-tile" onClick={() => goToGame(g.id)} type="button">
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="game-tile-icon" />
                    <div className="game-tile-name">{g.name}</div>
                    <div className="game-tile-desc">{g.description}</div>
                    <span className="pts-badge game-tile-pts">
                      {g.variablePayout ? 'Daily Challenge' : `+${g.pts ?? state.settings.gamePts} pts`}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {exitConfirmPending && (
          <div className="game-exit-confirm-overlay">
            <div className="game-result lose">
              <div className="game-result-title">Leave the game?</div>
              <div className="game-result-sub">Your progress this attempt will be lost.</div>
              <div className="game-result-actions">
                <button className="game-result-btn primary" onClick={confirmExit} type="button">
                  Exit Game
                </button>
                <button className="game-result-btn" onClick={() => setExitConfirmPending(null)} type="button">
                  Keep Playing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
