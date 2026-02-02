// Image URL pattern: https://pwm.im-cdn.it/image/{id}/{size}.jpg
// Available sizes: xs, s, m, m-c, l, xl, xxl
export type ImageSize = "xs" | "s" | "m" | "m-c" | "l" | "xl" | "xxl";

// Responsive defaults: mobile gets smaller images to save bandwidth
export const IMAGE_SIZE_MOBILE: ImageSize = "m";
export const IMAGE_SIZE_DESKTOP: ImageSize = "xl";
export const DEFAULT_IMAGE_SIZE: ImageSize = "xl"; // SSR fallback

export function buildImageUrl(imageId: string, size: ImageSize = DEFAULT_IMAGE_SIZE): string {
  return `https://pwm.im-cdn.it/image/${imageId}/${size}.jpg`;
}

export function extractImageId(url: string): string | null {
  const match = url.match(/\/image\/(\d+)\//);
  return match ? match[1] : null;
}
