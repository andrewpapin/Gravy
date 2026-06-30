import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { pickWord } from '../../data/hangmanWords';
import { shuffle } from '../../data/shuffle';

const MAX_WRONG_ATTEMPTS = 3;

interface WordScrambleGameProps {
  onExit: () => void;
}

interface Tile {
  id: string;
  letter: string;
}

interface Round {
  tiles: Tile[];
  trayOrder: string[];
}

function buildRound(word: string): Round {
  const tiles = word.split('').map((letter, i) => ({ id: `${i}-${letter}`, letter }));
  return { tiles, trayOrder: shuffle(tiles.map((t) => t.id)) };
}

export function WordScrambleGame({ onExit }: WordScrambleGameProps) {
  const { state, completeGameRound } = useGravy();
  const [game, setGame] = useState(() => pickWord());
  const [round, setRound] = useState<Round>(() => buildRound(game.word));
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(game.word.length).fill(null));
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const roundCompleteRef = useRef(false);

  const revealed = wrongAttempts >= MAX_WRONG_ATTEMPTS;
  const won = solved;
  const lost = !won && revealed;
  const gameOver = won || lost;

  useEffect(() => {
    if (gameOver && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeGameRound('scramble', won);
    }
  }, [gameOver, won, completeGameRound]);

  const tileLetter = (id: string | null) => (id ? round.tiles.find((t) => t.id === id)?.letter ?? '' : '');

  const handleTrayTap = (id: string) => {
    if (gameOver || slots.includes(id)) return;
    const emptyIndex = slots.indexOf(null);
    if (emptyIndex === -1) return;
    setSlots((prev) => {
      const next = [...prev];
      next[emptyIndex] = id;
      return next;
    });
  };

  const handleSlotTap = (index: number) => {
    if (gameOver || !slots[index]) return;
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleClear = () => {
    if (gameOver) return;
    setSlots(Array(game.word.length).fill(null));
  };

  const handleCheck = () => {
    if (gameOver || slots.some((s) => s === null)) return;
    const attempt = slots.map((id) => tileLetter(id)).join('');
    if (attempt === game.word) {
      setSolved(true);
      return;
    }
    const next = wrongAttempts + 1;
    setWrongAttempts(next);
    if (next >= MAX_WRONG_ATTEMPTS) {
      setSlots(round.tiles.map((t) => t.id));
    } else {
      setSlots(Array(game.word.length).fill(null));
      setRound((r) => ({ ...r, trayOrder: shuffle(r.trayOrder) }));
    }
  };

  const handlePlayAgain = () => {
    const next = pickWord(game.word);
    setGame(next);
    setRound(buildRound(next.word));
    setSlots(Array(next.word.length).fill(null));
    setWrongAttempts(0);
    setSolved(false);
    roundCompleteRef.current = false;
  };

  return (
    <div className="scramble-game">
      <div className="game-clue-label">Category: {game.category}</div>
      <div className="lives-row">
        {Array.from({ length: MAX_WRONG_ATTEMPTS }).map((_, i) => (
          <AppIcon
            key={i}
            iconKey={i < wrongAttempts ? 'heartCrack' : 'heart'}
            emojiFallback={i < wrongAttempts ? '💔' : '❤️'}
            className={`life-icon ${i < wrongAttempts ? 'cracked' : ''}`}
          />
        ))}
      </div>

      <div className="scramble-answer-row">
        {slots.map((id, i) => (
          <button
            key={i}
            type="button"
            className={`scramble-answer-slot ${id ? 'filled' : ''}`}
            onClick={() => handleSlotTap(i)}
            disabled={gameOver || !id}
          >
            {tileLetter(id)}
          </button>
        ))}
      </div>

      {gameOver ? (
        <div className={`game-result ${won ? 'win' : 'lose'}`}>
          {won ? (
            <>
              <div className="game-result-title">🎉 You spelled it!</div>
              <div className="game-result-sub">+{state.settings.gamePts} pts!</div>
            </>
          ) : (
            <>
              <div className="game-result-title">Aww, out of tries!</div>
              <div className="game-result-sub">The word was {game.word}.</div>
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
      ) : (
        <>
          <div className="scramble-tray">
            {round.trayOrder.map((id) => {
              const placed = slots.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`scramble-tray-letter ${placed ? 'placed' : ''}`}
                  onClick={() => handleTrayTap(id)}
                  disabled={placed}
                >
                  {tileLetter(id)}
                </button>
              );
            })}
          </div>
          <div className="scramble-actions">
            <button className="game-result-btn" onClick={handleClear} type="button">
              Clear
            </button>
            <button
              className="game-result-btn primary"
              onClick={handleCheck}
              type="button"
              disabled={slots.some((s) => s === null)}
            >
              Check
            </button>
          </div>
        </>
      )}
    </div>
  );
}
