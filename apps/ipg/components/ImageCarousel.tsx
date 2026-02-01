"use client";

import { useState } from "react";

interface ImageCarouselProps {
  images: string[];
  title: string;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  const displayImages = images.length > 0 ? images : [placeholderImage];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

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

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Vai alla foto ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-sm">
        {currentIndex + 1} / {displayImages.length}
      </div>
    </div>
  );
}
