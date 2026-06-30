import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { shuffle } from '../../data/shuffle';
import type { IconKey } from '../../data/icons';

const ICON_SET: IconKey[] = ['rocket', 'star', 'heart', 'dog', 'cat', 'tree', 'rainbow', 'trophy'];
const MAX_MISMATCHES = 10;
const MISMATCH_FLIP_BACK_MS = 700;

interface MemoryMatchGameProps {
  onExit: () => void;
}

interface Card {
  id: number;
  iconKey: IconKey;
}

function buildBoard(): Card[] {
  const pairs = ICON_SET.flatMap((iconKey, i) => [
    { id: i * 2, iconKey },
    { id: i * 2 + 1, iconKey },
  ]);
  return shuffle(pairs);
}

export function MemoryMatchGame({ onExit }: MemoryMatchGameProps) {
  const { state, completeGameRound } = useGravy();
  const [cards, setCards] = useState<Card[]>(() => buildBoard());
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [mismatchCount, setMismatchCount] = useState(0);
  const roundCompleteRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const won = matchedIds.size === cards.length;
  const lost = !won && mismatchCount >= MAX_MISMATCHES;
  const gameOver = won || lost;
  const triesLeft = MAX_MISMATCHES - mismatchCount;

  useEffect(() => {
    if (gameOver && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeGameRound('memory', won);
    }
  }, [gameOver, won, completeGameRound]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCardTap = (id: number) => {
    if (gameOver || matchedIds.has(id) || flippedIds.includes(id) || flippedIds.length === 2) return;

    if (flippedIds.length === 0) {
      setFlippedIds([id]);
      return;
    }

    const firstId = flippedIds[0];
    setFlippedIds([firstId, id]);
    const firstCard = cards.find((c) => c.id === firstId);
    const secondCard = cards.find((c) => c.id === id);
    if (firstCard && secondCard && firstCard.iconKey === secondCard.iconKey) {
      setMatchedIds((prev) => new Set(prev).add(firstId).add(id));
      setFlippedIds([]);
      return;
    }
    setMismatchCount((c) => c + 1);
    timeoutRef.current = window.setTimeout(() => {
      setFlippedIds([]);
    }, MISMATCH_FLIP_BACK_MS);
  };

  const handlePlayAgain = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCards(buildBoard());
    setFlippedIds([]);
    setMatchedIds(new Set());
    setMismatchCount(0);
    roundCompleteRef.current = false;
  };

  return (
    <div className="memory-game">
      <div className="memory-status-row">
        <div className="game-clue-label">Pairs: {matchedIds.size / 2} / {ICON_SET.length}</div>
        <div className={`game-clue-label ${triesLeft <= 2 ? 'low' : ''}`}>Tries left: {triesLeft}</div>
      </div>
      <div className="memory-grid">
        {cards.map((card) => {
          const faceUp = matchedIds.has(card.id) || flippedIds.includes(card.id) || lost;
          const matched = matchedIds.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${faceUp ? '' : 'face-down'} ${matched ? 'matched' : ''}`}
              onClick={() => handleCardTap(card.id)}
              disabled={gameOver || faceUp || flippedIds.length === 2}
              aria-label={faceUp ? card.iconKey : 'Face-down card'}
            >
              {faceUp && <AppIcon iconKey={card.iconKey} className="memory-card-icon" />}
            </button>
          );
        })}
      </div>

      {gameOver && (
        <div className={`game-result ${won ? 'win' : 'lose'}`}>
          {won ? (
            <>
              <div className="game-result-title">🎉 All matched!</div>
              <div className="game-result-sub">+{state.settings.gamePts} pts!</div>
            </>
          ) : (
            <>
              <div className="game-result-title">Aww, out of tries!</div>
              <div className="game-result-sub">So close — try again!</div>
            </>
          )}
          <div className="game-result-actions">
            <button className="game-result-btn primary" onClick={handlePlayAgain} type="button">
              Play Again
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
