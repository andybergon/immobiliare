"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import {
  buildImageUrl,
  type ImageSize,
  IMAGE_SIZE_MOBILE,
  IMAGE_SIZE_DESKTOP,
} from "@ipg/db/client";

interface ImageCarouselProps {
  images: string[];
  title: string;
}

const LOADER_DELAY_MS = 150;
const IMAGE_SIZES: ImageSize[] = ["xs", "s", "m", "l", "xl", "xxl"];

function isImageId(value: string): boolean {
  return /^\d+$/.test(value);
}

function getImageUrl(imageOrId: string, size: ImageSize): string {
  if (isImageId(imageOrId)) {
    return buildImageUrl(imageOrId, size);
  }
  return imageOrId.replace(/\/(xs|s|m|m-c|l|xl|xxl)\.jpg$/, `/${size}.jpg`);
}

const isDev = process.env.NODE_ENV === "development";
const MOBILE_BREAKPOINT = 768;

const SERVER_WIDTH_FALLBACK = 1024;

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedIndex, setLoadedIndex] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [manualImageSize, setManualImageSize] = useState<ImageSize>(IMAGE_SIZE_DESKTOP);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [manualSize, setManualSize] = useState(false);
  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const windowWidth = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("resize", onStoreChange);
      return () => window.removeEventListener("resize", onStoreChange);
    },
    () => window.innerWidth,
    () => SERVER_WIDTH_FALLBACK
  );

  const responsiveSize: ImageSize =
    windowWidth < MOBILE_BREAKPOINT ? IMAGE_SIZE_MOBILE : IMAGE_SIZE_DESKTOP;
  const imageSize = manualSize ? manualImageSize : responsiveSize;

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  const rawImages = images.length > 0 ? images : [placeholderImage];
  const displayImages = rawImages.map((img) =>
    img.includes("unsplash") ? img : getImageUrl(img, imageSize)
  );

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

      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isDev && (
          <div className="relative">
            <button
              onClick={() => setShowSizeMenu((v) => !v)}
              className="bg-black/60 hover:bg-black/80 p-1.5 rounded-full transition-colors"
              aria-label="Image size"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {showSizeMenu && (
              <div className="absolute top-full right-0 mt-1 bg-black/90 rounded-lg overflow-hidden shadow-lg">
                {IMAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setManualImageSize(size);
                      setManualSize(true);
                      setShowSizeMenu(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-sm text-left hover:bg-white/20 ${size === imageSize ? "bg-white/30 font-bold" : ""}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="bg-black/60 px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {displayImages.length}
        </div>
      </div>
    </div>
  );
}
