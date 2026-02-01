"use client";

import { useState } from "react";
import { KeyboardHint } from "./KeyboardHint";

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

  const hasValue = thousands.length > 0;
  const inputWidth = Math.max(3, thousands.length + 1);

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="price-guess" className="block text-lg mb-2">
        Quanto costa questo immobile?
      </label>
      <div className="flex gap-2">
        <div className="flex-1 bg-slate-600 rounded-lg flex items-center justify-between px-4 py-4">
          <div className="flex items-center">
            <span className="text-slate-400 text-2xl mr-2">€</span>
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
              tabIndex={1}
              style={{ width: `${inputWidth}ch` }}
              className="bg-transparent text-2xl focus:outline-none disabled:opacity-50 text-white"
            />
            <span className="text-slate-400 text-2xl">.000</span>
          </div>
          {!isFocused && !hasValue && <KeyboardHint keys="Tab" className="hidden sm:block" />}
        </div>
        <button
          type="submit"
          disabled={disabled || !hasValue}
          tabIndex={2}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-5 rounded-lg transition-colors flex items-center gap-2"
          title="Premi Invio per confermare"
        >
          <span className="hidden sm:inline">Indovina</span>
          <KeyboardHint keys="↵" className="bg-emerald-700 border-emerald-600" />
        </button>
      </div>
    </form>
  );
}
