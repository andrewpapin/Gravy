import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

interface CopyCodeButtonProps {
  code: string;
}

export function CopyCodeButton({ code }: CopyCodeButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<number | null>(null);

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    timerRef.current = window.setTimeout(() => setStatus('idle'), 1400);
  };

  return (
    <button
      type="button"
      className="copy-code-btn"
      onClick={handleCopy}
      aria-label={status === 'failed' ? "Couldn't copy — write the code down instead" : 'Copy household code to clipboard'}
    >
      <FontAwesomeIcon icon={status === 'copied' ? faCheck : status === 'failed' ? faTriangleExclamation : faCopy} />
    </button>
  );
}
