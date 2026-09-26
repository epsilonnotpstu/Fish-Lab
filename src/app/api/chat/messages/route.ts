import { NextResponse } from "next/server";
import { chatAccess, recentMessages } from "@/lib/chat";

/** Older messages, for scrolling up. */
export async function GET(request: Request) {
  const access = await chatAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const before = params.get("before") ?? undefined;
  const messages = await recentMessages(40, before && /^[a-z0-9]{10,40}$/i.test(before) ? before : undefined);
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
