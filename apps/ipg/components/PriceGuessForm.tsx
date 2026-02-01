"use client";

import { useState } from "react";

interface PriceGuessFormProps {
  onSubmit: (guess: number) => void;
  disabled?: boolean;
}

export function PriceGuessForm({ onSubmit, disabled = false }: PriceGuessFormProps) {
  const [value, setValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 10) {
      const formatted = raw ? parseInt(raw, 10).toLocaleString("it-IT") : "";
      setValue(formatted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseInt(value.replace(/\D/g, ""), 10);
    if (!isNaN(numericValue) && numericValue > 0) {
      onSubmit(numericValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="price-guess" className="block text-lg mb-2">
          Quanto costa questo immobile?
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">€</span>
          <input
            id="price-guess"
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            placeholder="350.000"
            disabled={disabled}
            className="w-full bg-slate-600 rounded-lg py-4 pl-12 pr-4 text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || !value}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors"
      >
        Indovina!
      </button>
    </form>
  );
}
