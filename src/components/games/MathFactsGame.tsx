import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../AppIcon';
import { useGravy } from '../../state/GravyContext';
import { generateMathQuestion, type MathQuestion } from '../../data/mathFacts';

const WIN_TARGET = 7;
const MAX_STRIKES = 3;
const FEEDBACK_MS = 600;

interface MathFactsGameProps {
  onExit: () => void;
}

interface Feedback {
  index: number;
  correct: boolean;
}

export function MathFactsGame({ onExit }: MathFactsGameProps) {
  const { state, completeGameRound } = useGravy();
  const [question, setQuestion] = useState<MathQuestion>(() => generateMathQuestion());
  const [correctCount, setCorrectCount] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const roundCompleteRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const won = correctCount >= WIN_TARGET;
  const lost = !won && strikeCount >= MAX_STRIKES;
  const gameOver = won || lost;

  useEffect(() => {
    if (gameOver && !roundCompleteRef.current) {
      roundCompleteRef.current = true;
      completeGameRound('mathfacts', won);
    }
  }, [gameOver, won, completeGameRound]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAnswer = (index: number) => {
    if (feedback || gameOver) return;
    const isCorrect = index === question.correctIndex;
    setFeedback({ index, correct: isCorrect });
    if (isCorrect) setCorrectCount((c) => c + 1);
    else setStrikeCount((s) => s + 1);
    timeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      setQuestion(generateMathQuestion());
    }, FEEDBACK_MS);
  };

  const handlePlayAgain = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setQuestion(generateMathQuestion());
    setCorrectCount(0);
    setStrikeCount(0);
    setFeedback(null);
    roundCompleteRef.current = false;
  };

  return (
    <div className="mathfacts-game">
      <div className="game-clue-label">Correct: {correctCount} / {WIN_TARGET}</div>
      <div className="lives-row">
        {Array.from({ length: MAX_STRIKES }).map((_, i) => (
          <AppIcon
            key={i}
            iconKey={i < strikeCount ? 'heartCrack' : 'heart'}
            emojiFallback={i < strikeCount ? '💔' : '❤️'}
            className={`life-icon ${i < strikeCount ? 'cracked' : ''}`}
          />
        ))}
      </div>

      {gameOver ? (
        <div className={`game-result ${won ? 'win' : 'lose'}`}>
          {won ? (
            <>
              <div className="game-result-title">🎉 Math whiz!</div>
              <div className="game-result-sub">+{state.settings.gamePts} pts!</div>
            </>
          ) : (
            <>
              <div className="game-result-title">Aww, 3 strikes!</div>
              <div className="game-result-sub">You got {correctCount} correct. Try again!</div>
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
          <div className="mathfacts-prompt">{question.prompt}</div>
          <div className="mathfacts-choices">
            {question.choices.map((choice, i) => {
              const isPicked = feedback?.index === i;
              const revealCorrect = feedback && !feedback.correct && i === question.correctIndex;
              const cls = isPicked ? (feedback?.correct ? 'correct' : 'wrong') : revealCorrect ? 'correct' : '';
              return (
                <button
                  key={i}
                  type="button"
                  className={`mathfacts-choice ${cls}`}
                  onClick={() => handleAnswer(i)}
                  disabled={!!feedback}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
