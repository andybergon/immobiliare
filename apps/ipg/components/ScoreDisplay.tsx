"use client";

interface ScoreDisplayProps {
  guess: number;
  actual: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function calculateScore(guess: number, actual: number): { score: number; percentOff: number; message: string } {
  const diff = Math.abs(guess - actual);
  const percentOff = (diff / actual) * 100;

  if (percentOff <= 5) return { score: 100, percentOff, message: "Perfetto! 🎯" };
  if (percentOff <= 10) return { score: 80, percentOff, message: "Ottimo! 🌟" };
  if (percentOff <= 15) return { score: 60, percentOff, message: "Bene! 👍" };
  if (percentOff <= 25) return { score: 40, percentOff, message: "Non male 🤔" };
  if (percentOff <= 40) return { score: 20, percentOff, message: "Ci sei quasi 😅" };
  return { score: 0, percentOff, message: "Riprova! 💪" };
}

export function ScoreDisplay({ guess, actual }: ScoreDisplayProps) {
  const { percentOff } = calculateScore(guess, actual);
  const isOver = guess > actual;

  return (
    <div className="bg-slate-700 rounded-lg p-6">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-slate-400 text-sm mb-2">Il prezzo reale</p>
          <p className="text-3xl font-bold text-emerald-400">{formatPrice(actual)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">La tua stima</p>
          <p className="text-3xl font-semibold">{formatPrice(guess)}</p>
          <p className="text-slate-400 text-sm mt-2">
            {isOver ? "↑" : "↓"} {percentOff.toFixed(1)}% {isOver ? "sopra" : "sotto"}
          </p>
        </div>
      </div>
    </div>
  );
}
