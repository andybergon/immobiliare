"use client";

import { useState, useRef } from "react";
import { KeyboardHint } from "./KeyboardHint";
import {
  formatInputValue,
  getSuffixZeros,
  getValue,
  parseInput,
} from "@/lib/price-input";

interface PriceGuessFormProps {
  onSubmit: (guess: number) => void;
  disabled?: boolean;
}

export function PriceGuessForm({ onSubmit, disabled = false }: PriceGuessFormProps) {
  const [rawValue, setRawValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInput(e.target.value);
    if (raw.length <= 9) {
      setRawValue(raw);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = getValue(rawValue);
    if (numericValue > 0) {
      onSubmit(numericValue);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const hasValue = rawValue.length > 0;
  const suffix = getSuffixZeros(rawValue);

  return (
    <form ref={formRef} onSubmit={handleSubmit} tabIndex={-1} className="focus:outline-none">
      <label htmlFor="price-guess" className="block text-lg mb-2">
        Quanto costa questo immobile?
      </label>
      <div className="flex gap-2">
        <div
          className="flex-1 bg-slate-600 rounded-lg flex items-center justify-between px-4 py-4 cursor-text"
          onClick={handleContainerClick}
        >
          <div className="inline-flex items-center">
            <span className="text-slate-400 text-2xl mr-2">€</span>
            <input
              ref={inputRef}
              id="price-guess"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatInputValue(rawValue)}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  inputRef.current?.blur();
                  formRef.current?.focus();
                }
              }}
              placeholder="xxx"
              disabled={disabled}
              style={{ fieldSizing: "content" } as React.CSSProperties}
              className="bg-transparent text-2xl focus:outline-none disabled:opacity-50 text-white"
            /><span className="text-slate-400 text-2xl">{suffix}</span>
          </div>
          {!isFocused && <KeyboardHint keys="Tab" className="hidden sm:block" />}
        </div>
        <button
          type="submit"
          disabled={disabled || !hasValue}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 sm:px-5 rounded-lg transition-colors flex items-center justify-center gap-2"
          title="Premi Invio per confermare"
        >
          <span>Indovina</span>
          <KeyboardHint keys="↵" className="hidden sm:flex bg-emerald-700 border-emerald-600" />
        </button>
      </div>
    </form>
  );
}
