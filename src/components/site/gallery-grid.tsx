"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { Expand } from "lucide-react";
import { SmartImage } from "./smart-image";

export function GalleryGrid({ images }: { images: { url: string; caption: string }[] }) {
  const [index, setIndex] = useState(-1);
  if (!images.length) return null;
  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
        {images.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative block w-full overflow-hidden rounded-2xl"
            aria-label={img.caption || `Open image ${i + 1}`}
          >
            <SmartImage
              src={img.url}
              alt={img.caption}
              width={800}
              height={i % 3 === 0 ? 1000 : 600}
              sizes="(min-width:640px) 33vw, 50vw"
              className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
              <Expand className="size-6" />
            </span>
            {img.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={images.map((i) => ({ src: i.url, description: i.caption || undefined }))}
        plugins={[Captions]}
      />
    </>
  );
}
