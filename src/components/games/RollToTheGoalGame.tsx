import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { todayStr } from '../../state/defaultState';
import {
  ROLL_TO_GOAL_ROUNDS_PER_DAY, ROLL_TO_GOAL_ATTEMPTS_PER_ROUND,
  getDailyTarget, rollDice, evaluateAttempt, pickBestAttempt, computeRoundOutcome, getRollToGoalPayout,
  TIER_LABELS, type AttemptOutcome, type RoundOutcome,
} from '../../data/rollToGoal';

interface RollToTheGoalGameProps {
  onExit: () => void;
  // Reports whether a round is currently "in progress" (at least one attempt rolled, not yet
  // resolved) — DailyGameDrawer uses this to gate its own back/close buttons behind a confirm,
  // since those bypass this component's onExit entirely.
  onRoundActiveChange?: (active: boolean) => void;
}

// Standard die-face pip layout on a 3x3 grid (indices 0-8, row-major).
const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value }: { value: number }) {
  const active = new Set(PIP_POSITIONS[value] ?? []);
  return (
    <div className="rollgoal-die-face" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`rollgoal-pip ${active.has(i) ? 'filled' : ''}`} />
      ))}
    </div>
  );
}

export function RollToTheGoalGame({ onExit, onRoundActiveChange }: RollToTheGoalGameProps) {
  const { state, completeRollToGoalRound } = useGravy();
  const dailyTarget = getDailyTarget(todayStr(state.settings.timezone));
  const roundsCompleted = state.rollGoalRoundsToday;
  const dayComplete = roundsCompleted >= ROLL_TO_GOAL_ROUNDS_PER_DAY;

  // Rolls attempt 1 immediately at mount (unless the day's already done) — no idle "start"
  // button, so opening the game (clicking Play) is a single action. Lazy initializers run once,
  // synchronously, on the first render — not in an effect — so this is a plain read, not a
  // cascading setState.
  const [attempts, setAttempts] = useState<AttemptOutcome[]>(() =>
    dayComplete ? [] : [evaluateAttempt(rollDice(), dailyTarget)]
  );
  const [roundResult, setRoundResult] = useState<RoundOutcome | null>(null);
  // Captured at round-start time from the then-current state.rollGoalRoundsToday, so the header/
  // result panel keep showing "Round 3 of 3" (not "4 of 3") after completeRollToGoalRound
  // increments the live counter out from under an in-progress or just-finished round.
  const [roundNumber, setRoundNumber] = useState<number | null>(() => (dayComplete ? null : roundsCompleted + 1));
  const roundCompleteRef = useRef(false);

  const roundActive = attempts.length > 0 && roundResult === null;
  // Only show the day-complete screen once the kid has moved past viewing their last round's
  // result — otherwise the live counter incrementing (via the effect below) would yank the
  // round-3 result panel away before they ever see it.
  const showDayComplete = dayComplete && attempts.length === 0;

  useEffect(() => {
    onRoundActiveChange?.(roundActive);
  }, [roundActive, onRoundActiveChange]);
  useEffect(() => () => onRoundActiveChange?.(false), [onRoundActiveChange]);

  useEffect(() => {
    if (roundResult && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeRollToGoalRound({ tier: roundResult.tier, displayScore: roundResult.displayScore, total: roundResult.total });
    }
  }, [roundResult, completeRollToGoalRound]);

  // Rolls attempt 1 and starts a fresh round immediately — no idle "start" button, so moving to
  // the next round is a single action (the very first round is started by the lazy initializers
  // above instead, since this is only reachable via a click, never at mount).
  const beginRound = () => {
    const nextRoundNumber = state.rollGoalRoundsToday + 1;
    const first = evaluateAttempt(rollDice(), dailyTarget);
    roundCompleteRef.current = false;
    setRoundResult(null);
    setRoundNumber(nextRoundNumber);
    setAttempts([first]);
  };

  const rollNextAttempt = () => {
    if (roundResult || attempts.length === 0 || attempts.length >= ROLL_TO_GOAL_ATTEMPTS_PER_ROUND) return;
    const next = [...attempts, evaluateAttempt(rollDice(), dailyTarget)];
    setAttempts(next);
    if (next.length >= ROLL_TO_GOAL_ATTEMPTS_PER_ROUND) {
      setRoundResult(computeRoundOutcome(pickBestAttempt(next)));
    }
  };

  const handleContinue = () => {
    const wasLastRound = (roundNumber ?? roundsCompleted) >= ROLL_TO_GOAL_ROUNDS_PER_DAY;
    if (wasLastRound) {
      setAttempts([]);
      setRoundResult(null);
      setRoundNumber(null);
      roundCompleteRef.current = false;
    } else {
      beginRound();
    }
  };

  if (showDayComplete) {
    return (
      <div className="rollgoal-game">
        <div className="game-result win">
          <div className="game-result-title">🎲 Daily Challenge Complete!</div>
          <div className="game-result-sub">Final Daily Score: {state.rollGoalDailyScore}</div>
          <div className="game-result-actions">
            <button className="game-result-btn primary" onClick={onExit} type="button">
              Back to Arcade
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rollToGoalPayoutPreview = roundResult
    ? getRollToGoalPayout(roundResult.tier, state.settings.gamePts)
    : 0;
  const bestIndex = roundResult
    ? attempts.findIndex((a) => a.total === roundResult.total && a.bust === roundResult.bust)
    : -1;

  return (
    <div className="rollgoal-game">
      <div className="rollgoal-status-row">
        <div className="game-clue-label">Round {roundNumber ?? roundsCompleted + 1} of {ROLL_TO_GOAL_ROUNDS_PER_DAY} · Target: {dailyTarget}</div>
        <div className="game-clue-label">Attempt {Math.min(attempts.length, ROLL_TO_GOAL_ATTEMPTS_PER_ROUND)} of {ROLL_TO_GOAL_ATTEMPTS_PER_ROUND}</div>
      </div>

      <div className="rollgoal-attempts-list">
        {attempts.map((a, i) => (
          <div key={i} className={`rollgoal-attempt-row ${roundResult && i === bestIndex ? 'kept' : ''} ${a.bust ? 'bust' : ''}`}>
            <div className="rollgoal-dice-row compact">
              {a.dice.map((value, di) => (
                <DieFace key={di} value={value} />
              ))}
            </div>
            <div className="rollgoal-attempt-total">
              {a.bust ? 'Bust!' : `Total: ${a.total}`}
              {roundResult && i === bestIndex && <span className="rollgoal-attempt-kept-badge">Kept</span>}
            </div>
          </div>
        ))}
      </div>

      {!roundResult ? (
        attempts.length > 0 && attempts.length < ROLL_TO_GOAL_ATTEMPTS_PER_ROUND ? (
          <button className="rollgoal-roll-btn" onClick={rollNextAttempt} type="button">
            <AppIcon iconKey="dice" emojiFallback="🎲" /> Roll Attempt {attempts.length + 1} of {ROLL_TO_GOAL_ATTEMPTS_PER_ROUND}
          </button>
        ) : null
      ) : (
        <div className={`game-result ${roundResult.bust ? 'lose' : 'win'}`}>
          <div className="game-result-title">{TIER_LABELS[roundResult.tier]}</div>
          <div className="game-result-sub">+{roundResult.displayScore} pts</div>
          {rollToGoalPayoutPreview > 0 && (
            <div className="game-result-sub">+{rollToGoalPayoutPreview} Gravy pts</div>
          )}
          <div className="game-result-actions">
            <button className="game-result-btn primary" onClick={handleContinue} type="button">
              {(roundNumber ?? roundsCompleted) >= ROLL_TO_GOAL_ROUNDS_PER_DAY ? 'See Final Score' : 'Next Round'}
            </button>
            <button className="game-result-btn" onClick={onExit} type="button">
              Back to Arcade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
