"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageCarouselProps {
  images: string[];
  title: string;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  const displayImages = images.length > 0 ? images : [placeholderImage];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  }, [displayImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  }, [displayImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  return (
    <div className="relative aspect-video bg-slate-800">
      <img
        src={displayImages[currentIndex]}
        alt={`${title} - Foto ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = placeholderImage;
        }}
      />

      {displayImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="Foto precedente"
          >
            ←
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="Foto successiva"
          >
            →
          </button>
        </>
      )}

      <div className="absolute top-2 right-2 bg-black/60 px-3 py-1 rounded-full text-sm font-medium">
        {currentIndex + 1} / {displayImages.length}
      </div>
    </div>
  );
}
