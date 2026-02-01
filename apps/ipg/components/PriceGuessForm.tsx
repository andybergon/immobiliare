"use client";

import { useState } from "react";

interface PriceGuessFormProps {
  onSubmit: (guess: number) => void;
  disabled?: boolean;
}

export function PriceGuessForm({ onSubmit, disabled = false }: PriceGuessFormProps) {
  const [thousands, setThousands] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 7) {
      const formatted = raw ? parseInt(raw, 10).toLocaleString("it-IT") : "";
      setThousands(formatted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseInt(thousands.replace(/\D/g, ""), 10) * 1000;
    if (!isNaN(numericValue) && numericValue > 0) {
      onSubmit(numericValue);
    }
  };

  const displayValue = thousands ? `${thousands}.000` : "";
  const hasValue = thousands.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="price-guess" className="block text-lg mb-2">
        Quanto costa questo immobile?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">€</span>
          <input
            id="price-guess"
            type="text"
            inputMode="numeric"
            value={thousands}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="350"
            disabled={disabled}
            autoFocus
            className="w-full bg-slate-600 rounded-lg py-4 pl-12 pr-20 text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">
            .000
          </span>
        </div>
        <button
          type="submit"
          disabled={disabled || !hasValue}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-6 rounded-lg transition-colors flex items-center gap-2"
          title="Premi Invio per confermare"
        >
          <span className="hidden sm:inline">Indovina</span>
          <kbd className="bg-emerald-700 px-2 py-1 rounded text-sm">↵</kbd>
        </button>
      </div>
    </form>
  );
}
