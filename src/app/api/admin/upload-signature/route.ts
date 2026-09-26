import { NextResponse } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { chatAccess } from "@/lib/chat";
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

  const limit = isStaff(user.role) ? 200 : 60;
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
  // Chat attachments are open to anyone who may post in the group; plain file
  // uploads stay with staff, and everyone else gets the image-only rules.
  let kind: "image" | "file" | "chat" = "image";
  if (body.kind === "chat") {
    if (!(await chatAccess())) {
      return NextResponse.json({ error: "You cannot post in the lab group." }, { status: 403 });
    }
    kind = "chat";
  } else if (body.kind === "file" && isStaff(user.role)) {
    kind = "file";
  }
  return NextResponse.json(signUpload(kind), { headers: { "Cache-Control": "no-store" } });
}
