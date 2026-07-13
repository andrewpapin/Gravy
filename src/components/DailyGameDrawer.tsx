import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { AppIcon } from './AppIcon';
import { StatTile } from './charts/StatTile';
import { useGravy } from '../state/GravyContext';
import { todayStr } from '../state/defaultState';
import { getGamesBreakdown, getRollToGoalHistory } from '../state/statsSnapshot';
import { ROLL_TO_GOAL_GAME_ID, ROLL_TO_GOAL_ROUNDS_PER_DAY, getDailyTarget, TIER_LABELS } from '../data/rollToGoal';
import { RollToTheGoalGame } from './games/RollToTheGoalGame';
import type { GravyState } from '../state/types';

interface DailyGameDrawerProps {
  open: boolean;
  onClose: () => void;
}

type View = 'info' | 'play';

function pointsEarnedToday(state: GravyState): number {
  const today = todayStr(state.settings.timezone);
  return state.actionLog
    .filter((e) => e.type === 'game' && e.itemId === ROLL_TO_GOAL_GAME_ID && !e.undone && e.dateStr === today)
    .reduce((sum, e) => sum + e.pts, 0);
}

function DailyGameInfo({ onPlay }: { onPlay: () => void }) {
  const { state } = useGravy();
  const dailyTarget = getDailyTarget(todayStr(state.settings.timezone));
  const roundsPlayed = state.rollGoalRoundsToday;
  const dayComplete = roundsPlayed >= ROLL_TO_GOAL_ROUNDS_PER_DAY;
  const breakdown = useMemo(() => getGamesBreakdown(state), [state]);
  const history = useMemo(() => getRollToGoalHistory(state), [state]);
  const pointsToday = useMemo(() => pointsEarnedToday(state), [state]);

  return (
    <div className="daily-game-info">
      <section className="rollgoal-blurb">
        <AppIcon iconKey="dice" emojiFallback="🎲" className="rollgoal-blurb-icon" />
        <p>Roll 10 dice, up to 3 times, and get as close to today's target — <strong>{dailyTarget}</strong> — as you can. Your closest attempt is kept!</p>
        <p className="game-clue-label">Round {Math.min(roundsPlayed + 1, ROLL_TO_GOAL_ROUNDS_PER_DAY)} of {ROLL_TO_GOAL_ROUNDS_PER_DAY}</p>
        <button className="rollgoal-roll-btn" onClick={onPlay} disabled={dayComplete} type="button">
          {dayComplete ? "Today's Challenge Complete" : (
            <>
              <AppIcon iconKey="dice" emojiFallback="🎲" /> Play
            </>
          )}
        </button>
      </section>

      <section className="stats-section">
        <h3 className="stats-section-title">Today</h3>
        <div className="stat-tile-grid">
          <StatTile icon="dice" value={`${roundsPlayed}/${ROLL_TO_GOAL_ROUNDS_PER_DAY}`} label="Rounds Played" />
          <StatTile icon="bolt" value={state.rollGoalDailyScore} label="Daily Score" />
          <StatTile icon="sackDollar" value={pointsToday} label="Points Earned" />
        </div>
        {state.rollGoalRoundsLog.length > 0 && (
          <ul className="rollgoal-history-list">
            {state.rollGoalRoundsLog.map((r) => (
              <li key={r.round} className="rollgoal-history-row">
                <span className="rollgoal-history-row-label">
                  Round {r.round}: {TIER_LABELS[r.tier]} ({r.total} vs {dailyTarget})
                </span>
                <span className="rollgoal-history-row-pts">
                  {r.pending ? 'Pending' : r.pts > 0 ? `+${r.pts} pts` : `${r.displayScore} pts`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stats-section">
        <h3 className="stats-section-title">History</h3>
        <div className="stat-tile-grid">
          <StatTile icon="gamepad" value={breakdown.gamesPlayed} label="Games Played" />
          <StatTile icon="trophy" value={breakdown.gamesWon} label="Games Won" />
          <StatTile icon="bolt" value={`${Math.round(breakdown.winRate * 100)}%`} label="Win Rate" />
        </div>
        {history.length > 0 ? (
          <ul className="rollgoal-history-list">
            {history.map((h) => (
              <li key={h.id} className="rollgoal-history-row">
                <span className="rollgoal-history-row-label">{h.label}</span>
                <span className="rollgoal-history-row-date">{h.dateStr}</span>
                <span className="rollgoal-history-row-pts">+{h.pts} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stats-section-caption">No rounds played yet.</p>
        )}
      </section>
    </div>
  );
}

export function DailyGameDrawer({ open, onClose }: DailyGameDrawerProps) {
  const [view, setView] = useState<View>('info');
  // Whether Roll to the Goal reports a round in progress (dice rolled, not yet submitted) — used
  // to gate the back/close buttons behind a confirm, since backing out mid-round loses progress.
  const [gameRoundActive, setGameRoundActive] = useState(false);
  const [exitConfirmPending, setExitConfirmPending] = useState<null | 'back' | 'close'>(null);

  const goTo = (v: View) => {
    setView(v);
    setGameRoundActive(false);
    setExitConfirmPending(null);
  };

  const handleClose = () => {
    onClose();
    goTo('info');
  };

  const requestExit = (kind: 'back' | 'close') => {
    if (gameRoundActive) {
      setExitConfirmPending(kind);
      return;
    }
    if (kind === 'back') goTo('info');
    else handleClose();
  };

  const confirmExit = () => {
    const kind = exitConfirmPending;
    if (kind === 'back') goTo('info');
    else if (kind === 'close') handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => requestExit('close')}
      onBack={view === 'play' ? () => requestExit('back') : undefined}
      closeLabel="Close daily game"
      title={view === 'play' ? 'Roll to the Goal' : 'Daily Game'}
      overlayClassName="rollgoal-modal-overlay"
    >
      {view === 'info' ? (
        <DailyGameInfo onPlay={() => goTo('play')} />
      ) : (
        <RollToTheGoalGame onExit={() => goTo('info')} onRoundActiveChange={setGameRoundActive} />
      )}
      {exitConfirmPending && (
        <div className="game-exit-confirm-overlay">
          <div className="game-result lose">
            <div className="game-result-title">Leave the game?</div>
            <div className="game-result-sub">Your progress this round will be lost.</div>
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
    </Modal>
  );
}
