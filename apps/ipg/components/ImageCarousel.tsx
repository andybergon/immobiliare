"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ImageCarouselProps {
  images: string[];
  title: string;
}

const LOADER_DELAY_MS = 150;

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedIndex, setLoadedIndex] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  const displayImages = images.length > 0 ? images : [placeholderImage];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  }, [displayImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  }, [displayImages.length]);

  useEffect(() => {
    if (currentIndex === loadedIndex) {
      return;
    }

    loaderTimeoutRef.current = setTimeout(() => {
      setShowLoader(true);
    }, LOADER_DELAY_MS);

    return () => {
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
    };
  }, [currentIndex, loadedIndex]);

  const handleImageLoad = useCallback(() => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
    setShowLoader(false);
    setLoadedIndex(currentIndex);
  }, [currentIndex]);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      (e.target as HTMLImageElement).src = placeholderImage;
      handleImageLoad();
    },
    [handleImageLoad]
  );

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

  const isLoading = currentIndex !== loadedIndex;

  return (
    <div className="relative aspect-video bg-slate-800 overflow-hidden">
      {isLoading && (
        <img
          src={displayImages[loadedIndex]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}

      <img
        key={currentIndex}
        src={displayImages[currentIndex]}
        alt={`${title} - Foto ${currentIndex + 1}`}
        className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-3 border-black/40 border-t-black rounded-full animate-spin" />
        </div>
      )}

      {displayImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            tabIndex={-1}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/90 hover:bg-black text-white p-3 rounded-full transition-colors text-lg"
            aria-label="Foto precedente"
          >
            ←
          </button>
          <button
            onClick={goToNext}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/90 hover:bg-black text-white p-3 rounded-full transition-colors text-lg"
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
