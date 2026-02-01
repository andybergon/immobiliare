interface KeyboardHintProps {
  keys: string;
  className?: string;
}

export function KeyboardHint({ keys, className = "" }: KeyboardHintProps) {
  return (
    <kbd
      className={`text-xs text-slate-300 bg-slate-700/80 px-2 py-1 rounded border border-slate-600 font-mono ${className}`}
    >
      {keys}
    </kbd>
  );
}
