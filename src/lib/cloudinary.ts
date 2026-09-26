import "server-only";
import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

export const UPLOAD_RULES = {
  image: { formats: "jpg,jpeg,png,webp,gif,svg,avif", maxBytes: 10 * 1024 * 1024 },
  file: { formats: "pdf,jpg,jpeg,png,webp", maxBytes: 20 * 1024 * 1024 },
  chat: {
    formats: "jpg,jpeg,png,webp,gif,heic,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,mp3,m4a,aac,ogg,wav,webm,mp4",
    maxBytes: 25 * 1024 * 1024,
  },
} as const;

/**
 * Sign an upload so the browser can send the file straight to Cloudinary.
 * The folder and allowed formats are part of the signature, so the client
 * cannot change them.
 */
export function signUpload(kind: keyof typeof UPLOAD_RULES) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const folder = `${process.env.CLOUDINARY_FOLDER || "lab-website"}/${
    kind === "image" ? "images" : kind === "chat" ? "chat" : "files"
  }`;
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder, allowed_formats: UPLOAD_RULES[kind].formats };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return { ...params, signature, apiKey, cloudName, maxBytes: UPLOAD_RULES[kind].maxBytes };
}
