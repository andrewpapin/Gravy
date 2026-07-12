import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { todayStr } from '../../state/defaultState';
import {
  ROLL_TO_GOAL_ROUNDS_PER_DAY, ROLL_TO_GOAL_REROLLS_PER_ROUND,
  getDailyTarget, rollDice, rerollDice, sumDice, computeRoundOutcome, getRollToGoalPayout,
  TIER_LABELS, type RoundOutcome,
} from '../../data/rollToGoal';

interface RollToTheGoalGameProps {
  onExit: () => void;
  // Reports whether a round is currently "in progress" (dice rolled, not yet submitted) —
  // GamesScreen uses this to gate its own chevron-back/close buttons behind a confirm, since
  // those bypass this component's onExit entirely.
  onRoundActiveChange?: (active: boolean) => void;
}

type Result = RoundOutcome & { total: number };

export function RollToTheGoalGame({ onExit, onRoundActiveChange }: RollToTheGoalGameProps) {
  const { state, completeRollToGoalRound } = useGravy();
  const [dice, setDice] = useState<number[] | null>(null);
  const [held, setHeld] = useState<Set<number>>(new Set());
  const [rerollsLeft, setRerollsLeft] = useState(ROLL_TO_GOAL_REROLLS_PER_ROUND);
  const [peekedTotal, setPeekedTotal] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<Result | null>(null);
  // Captured at roll time from the then-current state.rollGoalRoundsToday, so the header/result
  // panel keep showing "Round 3 of 3" (not "4 of 3") after completeRollToGoalRound increments the
  // live counter out from under an in-progress or just-finished round.
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const roundCompleteRef = useRef(false);

  const dailyTarget = getDailyTarget(todayStr(state.settings.timezone));
  const roundsCompleted = state.rollGoalRoundsToday;
  const dayComplete = roundsCompleted >= ROLL_TO_GOAL_ROUNDS_PER_DAY;
  const roundActive = dice !== null && roundResult === null;
  // Only show the day-complete screen once the kid has moved past viewing their last round's
  // result — otherwise the live counter incrementing (via the effect below) would yank the
  // round-3 result panel away before they ever see it.
  const showDayComplete = dayComplete && dice === null;

  useEffect(() => {
    onRoundActiveChange?.(roundActive);
  }, [roundActive, onRoundActiveChange]);
  useEffect(() => () => onRoundActiveChange?.(false), [onRoundActiveChange]);

  useEffect(() => {
    if (roundResult && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeRollToGoalRound({ tier: roundResult.tier, displayScore: roundResult.displayScore });
    }
  }, [roundResult, completeRollToGoalRound]);

  const resetRound = () => {
    setDice(null);
    setHeld(new Set());
    setRerollsLeft(ROLL_TO_GOAL_REROLLS_PER_ROUND);
    setPeekedTotal(null);
    setRoundResult(null);
    setRoundNumber(null);
    roundCompleteRef.current = false;
  };

  const handleRollInitial = () => {
    if (dayComplete) return;
    const nextRoundNumber = state.rollGoalRoundsToday + 1;
    resetRound();
    setRoundNumber(nextRoundNumber);
    setDice(rollDice());
  };

  const handleToggleHold = (i: number) => {
    if (!dice || roundResult) return;
    setHeld((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleReroll = () => {
    if (!dice || roundResult || rerollsLeft <= 0) return;
    setDice(rerollDice(dice, held));
    setRerollsLeft((r) => r - 1);
    setPeekedTotal(null);
  };

  const handlePeek = () => {
    if (!dice || roundResult || rerollsLeft <= 0) return;
    setPeekedTotal(sumDice(dice));
    setRerollsLeft((r) => r - 1);
  };

  const handleSubmit = () => {
    if (!dice || roundResult) return;
    const total = sumDice(dice);
    setRoundResult({ ...computeRoundOutcome(total, dailyTarget, rerollsLeft), total });
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

  return (
    <div className="rollgoal-game">
      <div className="rollgoal-status-row">
        <div className="game-clue-label">Round {roundNumber ?? roundsCompleted + 1} of {ROLL_TO_GOAL_ROUNDS_PER_DAY} · Target: {dailyTarget}</div>
        <div className="game-clue-label">Rerolls: {rerollsLeft}/{ROLL_TO_GOAL_REROLLS_PER_ROUND}</div>
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
                disabled={!!roundResult}
                aria-label={`Die showing ${value}${held.has(i) ? ', held' : ''}`}
              >
                {value}
                {held.has(i) && <AppIcon iconKey="circleCheck" className="rollgoal-die-held-badge" />}
              </button>
            ))}
          </div>

          {(peekedTotal !== null || roundResult) && (
            <div className="game-clue-label">Total: {roundResult ? roundResult.total : peekedTotal}</div>
          )}

          {!roundResult ? (
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
            <div className={`game-result ${roundResult.bust ? 'lose' : 'win'}`}>
              <div className="game-result-title">{TIER_LABELS[roundResult.tier]}</div>
              <div className="game-result-sub">+{roundResult.displayScore} pts</div>
              {rollToGoalPayoutPreview > 0 && (
                <div className="game-result-sub">+{rollToGoalPayoutPreview} Gravy pts</div>
              )}
              <div className="game-result-actions">
                <button className="game-result-btn primary" onClick={resetRound} type="button">
                  {(roundNumber ?? roundsCompleted) >= ROLL_TO_GOAL_ROUNDS_PER_DAY ? 'See Final Score' : 'Next Round'}
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
