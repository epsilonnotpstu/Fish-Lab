export type UploadKind = "image" | "file";

type Signature = {
  timestamp: number;
  folder: string;
  allowed_formats: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  maxBytes: number;
};

/** Upload directly from the browser to Cloudinary using a server-issued signature. */
export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  const sigRes = await fetch("/api/admin/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  const sig = (await sigRes.json()) as Signature & { error?: string };
  if (!sigRes.ok) throw new Error(sig.error || "Upload is not available.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!sig.allowed_formats.split(",").includes(ext)) {
    throw new Error(`Unsupported file type. Allowed: ${sig.allowed_formats.replace(/,/g, ", ")}`);
  }
  if (file.size > sig.maxBytes) {
    throw new Error(`File is too large (max ${Math.round(sig.maxBytes / 1024 / 1024)} MB).`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("allowed_formats", sig.allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${kind === "image" ? "image" : "auto"}/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed.");
  return data.secure_url;
}
