import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cloudinaryConfigured, signUpload } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Same-origin only (defence in depth on top of SameSite cookies).
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = user.role === "MEMBER" ? 20 : 120;
  if (!(await rateLimit(`upload:${user.id}`, limit, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Upload limit reached, try again later." }, { status: 429 });
  }
  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Uploads are not configured. Add Cloudinary keys to the environment, or paste an image URL." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { kind?: string };
  // Members may only upload images (their profile photo); staff can upload files too.
  const kind = body.kind === "file" && user.role !== "MEMBER" ? "file" : "image";
  return NextResponse.json(signUpload(kind), { headers: { "Cache-Control": "no-store" } });
}
