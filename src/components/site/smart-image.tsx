import Image, { type ImageProps } from "next/image";

const OPTIMIZABLE = ["res.cloudinary.com", "images.unsplash.com"];

function canOptimize(src: string) {
  try {
    return OPTIMIZABLE.includes(new URL(src).hostname);
  } catch {
    return src.startsWith("/");
  }
}

/**
 * next/image for hosts we trust the optimiser with; anything else an admin
 * pastes is rendered unoptimised so the image proxy can't be abused.
 */
export function SmartImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  if (!src) return null;
  return <Image src={src} alt={alt} unoptimized={!canOptimize(src)} {...props} />;
}
