import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { todayStr } from '../../state/defaultState';
import {
  ROLL_TO_GOAL_MAX_ATTEMPTS, ROLL_TO_GOAL_REROLLS_PER_ATTEMPT,
  getDailyTarget, rollDice, rerollDice, sumDice, computeAttemptOutcome, getRollToGoalPayout,
  TIER_LABELS, type AttemptOutcome,
} from '../../data/rollToGoal';

interface RollToTheGoalGameProps {
  onExit: () => void;
  // Reports whether an attempt is currently "in progress" (dice rolled, not yet submitted) —
  // GamesScreen uses this to gate its own chevron-back/close buttons behind a confirm, since
  // those bypass this component's onExit entirely.
  onAttemptActiveChange?: (active: boolean) => void;
}

type Result = AttemptOutcome & { total: number };

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

function TargetBadge({ target }: { target: number }) {
  return (
    <div className="rollgoal-target-badge">
      <AppIcon iconKey="bullseye" emojiFallback="🎯" className="rollgoal-target-icon" />
      <div className="rollgoal-target-text">
        <span className="rollgoal-target-label">Today's Target</span>
        <span className="rollgoal-target-value">{target}</span>
      </div>
    </div>
  );
}

export function RollToTheGoalGame({ onExit, onAttemptActiveChange }: RollToTheGoalGameProps) {
  const { state, completeRollToGoalAttempt } = useGravy();
  const [dice, setDice] = useState<number[] | null>(null);
  const [held, setHeld] = useState<Set<number>>(new Set());
  const [rerollsLeft, setRerollsLeft] = useState(ROLL_TO_GOAL_REROLLS_PER_ATTEMPT);
  const [peekedTotal, setPeekedTotal] = useState<number | null>(null);
  const [attemptResult, setAttemptResult] = useState<Result | null>(null);
  // Captured at roll time from the then-current state.rollGoalAttemptsToday, so the header/result
  // panel keep showing "Attempt 3 of 3" (not "4 of 3") after completeRollToGoalAttempt increments
  // the live counter out from under an in-progress or just-finished attempt.
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const attemptCompleteRef = useRef(false);

  const dailyTarget = getDailyTarget(todayStr(state.settings.timezone));
  const attemptsUsed = state.rollGoalAttemptsToday;
  // Any non-bust attempt wins and ends the day for good — busting out of all 3 attempts also
  // ends the day (with no score) until tomorrow's new target.
  const wonToday = state.rollGoalTodayScore > 0;
  const dayOver = wonToday || attemptsUsed >= ROLL_TO_GOAL_MAX_ATTEMPTS;
  const attemptActive = dice !== null && attemptResult === null;
  // Only show the day-over screen once the kid has moved past viewing their last attempt's
  // result — otherwise the live counter/win flipping (via the effect below) would yank that
  // result panel away before they ever see it.
  const showDayOver = dayOver && dice === null;

  useEffect(() => {
    onAttemptActiveChange?.(attemptActive);
  }, [attemptActive, onAttemptActiveChange]);
  useEffect(() => () => onAttemptActiveChange?.(false), [onAttemptActiveChange]);

  useEffect(() => {
    if (attemptResult && !attemptCompleteRef.current) {
      attemptCompleteRef.current = true;
      completeRollToGoalAttempt({ tier: attemptResult.tier, displayScore: attemptResult.displayScore });
    }
  }, [attemptResult, completeRollToGoalAttempt]);

  const resetAttempt = () => {
    setDice(null);
    setHeld(new Set());
    setRerollsLeft(ROLL_TO_GOAL_REROLLS_PER_ATTEMPT);
    setPeekedTotal(null);
    setAttemptResult(null);
    setAttemptNumber(null);
    attemptCompleteRef.current = false;
  };

  const handleRollInitial = () => {
    if (dayOver) return;
    const nextAttemptNumber = state.rollGoalAttemptsToday + 1;
    resetAttempt();
    setAttemptNumber(nextAttemptNumber);
    setDice(rollDice());
  };

  const handleToggleHold = (i: number) => {
    if (!dice || attemptResult) return;
    setHeld((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleReroll = () => {
    if (!dice || attemptResult || rerollsLeft <= 0) return;
    setDice(rerollDice(dice, held));
    setRerollsLeft((r) => r - 1);
    setPeekedTotal(null);
  };

  const handlePeek = () => {
    if (!dice || attemptResult || rerollsLeft <= 0) return;
    setPeekedTotal(sumDice(dice));
    setRerollsLeft((r) => r - 1);
  };

  const handleSubmit = () => {
    if (!dice || attemptResult) return;
    const total = sumDice(dice);
    setAttemptResult({ ...computeAttemptOutcome(total, dailyTarget, rerollsLeft), total });
  };

  if (showDayOver) {
    return (
      <div className="rollgoal-game">
        <TargetBadge target={dailyTarget} />
        <div className={`game-result ${wonToday ? 'win' : 'lose'}`}>
          {wonToday ? (
            <>
              <div className="game-result-title">🎉 You Won Today!</div>
              <div className="game-result-sub">Score: {state.rollGoalTodayScore}</div>
            </>
          ) : (
            <>
              <div className="game-result-title">Out of Tries!</div>
              <div className="game-result-sub">Come back tomorrow for a new target.</div>
            </>
          )}
          <div className="game-result-actions">
            <button className="game-result-btn primary" onClick={onExit} type="button">
              Back to Arcade
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rollToGoalPayoutPreview = attemptResult
    ? getRollToGoalPayout(attemptResult.tier, state.settings.gamePts)
    : 0;
  // A win always ends the day; a bust only ends it once every attempt is used up.
  const attemptEndsDay = !!attemptResult && (!attemptResult.bust || (attemptNumber ?? attemptsUsed) >= ROLL_TO_GOAL_MAX_ATTEMPTS);

  return (
    <div className="rollgoal-game">
      <TargetBadge target={dailyTarget} />
      <div className="rollgoal-status-row">
        <div className="game-clue-label">Attempt {attemptNumber ?? attemptsUsed + 1} of {ROLL_TO_GOAL_MAX_ATTEMPTS}</div>
        <div className="game-clue-label">Rerolls: {rerollsLeft}/{ROLL_TO_GOAL_REROLLS_PER_ATTEMPT}</div>
      </div>

      {dice === null ? (
        <button className="rollgoal-roll-btn" onClick={handleRollInitial} type="button">
          <AppIcon iconKey="dice" emojiFallback="🎲" /> Roll the Dice
        </button>
      ) : (
        <>
          <div className="rollgoal-dice-row">
            {dice.map((value, i) => (
              <button
                key={i}
                type="button"
                className={`rollgoal-die ${held.has(i) ? 'held' : ''}`}
                onClick={() => handleToggleHold(i)}
                disabled={!!attemptResult}
                aria-label={`Die showing ${value}${held.has(i) ? ', held' : ''}`}
              >
                <DieFace value={value} />
                {held.has(i) && <AppIcon iconKey="circleCheck" className="rollgoal-die-held-badge" />}
              </button>
            ))}
          </div>

          {(peekedTotal !== null || attemptResult) && (
            <div className="game-clue-label">Total: {attemptResult ? attemptResult.total : peekedTotal}</div>
          )}

          {!attemptResult ? (
            <div className="rollgoal-actions-row">
              <button className="game-result-btn" onClick={handleReroll} disabled={rerollsLeft <= 0} type="button">
                Reroll
              </button>
              <button className="game-result-btn" onClick={handlePeek} disabled={rerollsLeft <= 0} type="button">
                Peek
              </button>
              <button className="game-result-btn primary" onClick={handleSubmit} type="button">
                Submit Score
              </button>
            </div>
          ) : (
            <div className={`game-result ${attemptResult.bust ? 'lose' : 'win'}`}>
              <div className="game-result-title">{TIER_LABELS[attemptResult.tier]}</div>
              <div className="game-result-sub">+{attemptResult.displayScore} pts</div>
              {rollToGoalPayoutPreview > 0 && (
                <div className="game-result-sub">+{rollToGoalPayoutPreview} Gravy pts</div>
              )}
              <div className="game-result-actions">
                <button className="game-result-btn primary" onClick={resetAttempt} type="button">
                  {attemptEndsDay ? 'See Result' : 'Try Again'}
                </button>
                <button className="game-result-btn" onClick={onExit} type="button">
                  Back to Arcade
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
