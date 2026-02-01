interface KeyboardHintProps {
  keys: string;
  className?: string;
}

export function KeyboardHint({ keys, className = "" }: KeyboardHintProps) {
  return (
    <kbd
      className={`text-[10px] text-slate-400 bg-slate-700/80 px-1.5 py-0.5 rounded border border-slate-600 font-mono ${className}`}
    >
      {keys}
    </kbd>
  );
}
