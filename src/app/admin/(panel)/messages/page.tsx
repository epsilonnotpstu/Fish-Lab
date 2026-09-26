import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/page-title";
import { MessagesInbox } from "@/components/admin/messages-inbox";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireUser();
  const { id } = await searchParams;
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <div>
      <PageTitle title="Messages" description="Inquiries sent through the website contact form." />
      <MessagesInbox
        initialId={id}
        messages={messages.map((m) => ({ id: m.id, name: m.name, email: m.email, subject: m.subject, type: m.type, message: m.message, read: m.read, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
