import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { pickHangmanWord } from '../../data/hangmanWords';

const MAX_WRONG_GUESSES = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface HangmanGameProps {
  onExit: () => void;
}

export function HangmanGame({ onExit }: HangmanGameProps) {
  const { state, completeGameRound } = useGravy();
  const [game, setGame] = useState(() => pickHangmanWord());
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const roundCompleteRef = useRef(false);

  const wordLetters = game.word.split('');
  const wrongCount = Array.from(guessed).filter((l) => !wordLetters.includes(l)).length;
  const won = wordLetters.every((l) => guessed.has(l));
  const lost = !won && wrongCount >= MAX_WRONG_GUESSES;
  const gameOver = won || lost;

  useEffect(() => {
    if (gameOver && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeGameRound('hangman', won);
    }
  }, [gameOver, won, completeGameRound]);

  const handleGuess = (letter: string) => {
    if (gameOver || guessed.has(letter)) return;
    setGuessed((prev) => new Set(prev).add(letter));
  };

  const handlePlayAgain = () => {
    setGame(pickHangmanWord(game.word));
    setGuessed(new Set());
    roundCompleteRef.current = false;
  };

  return (
    <div className="hangman-game">
      <div className="game-clue-label">Category: {game.category}</div>
      <div className="lives-row">
        {Array.from({ length: MAX_WRONG_GUESSES }).map((_, i) => (
          <AppIcon
            key={i}
            iconKey={i < wrongCount ? 'heartCrack' : 'heart'}
            emojiFallback={i < wrongCount ? '💔' : '❤️'}
            className={`life-icon ${i < wrongCount ? 'cracked' : ''}`}
          />
        ))}
      </div>
      <div className="hangman-word">
        {wordLetters.map((l, i) => (
          <span key={i} className="hangman-letter-tile">
            {guessed.has(l) || lost ? l : ''}
          </span>
        ))}
      </div>

      {gameOver ? (
        <div className={`game-result ${won ? 'win' : 'lose'}`}>
          {won ? (
            <>
              <div className="game-result-title">🎉 You got it!</div>
              <div className="game-result-sub">+{state.settings.gamePts} pts!</div>
            </>
          ) : (
            <>
              <div className="game-result-title">Aww, out of hearts!</div>
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
        <div className="hangman-keyboard">
          {ALPHABET.map((letter) => {
            const isGuessed = guessed.has(letter);
            const isCorrect = isGuessed && wordLetters.includes(letter);
            return (
              <button
                key={letter}
                type="button"
                className={`hangman-key ${isGuessed ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                onClick={() => handleGuess(letter)}
                disabled={isGuessed}
                aria-label={`Guess letter ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
