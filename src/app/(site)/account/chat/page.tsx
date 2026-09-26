import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isStaff, requireAccount } from "@/lib/auth";
import { chatAccess, recentMessages } from "@/lib/chat";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { ChatRoom } from "@/components/chat/chat-room";

export const metadata: Metadata = { title: "Lab group", robots: { index: false } };

export default async function MemberChatPage() {
  const user = await requireAccount();
  if (isStaff(user.role)) redirect("/admin/chat");
  const access = await chatAccess();
  if (!access) redirect("/account");

  const [messages, settings] = await Promise.all([recentMessages(), getSettings()]);

  return (
    <>
      <PageHeader
        compact
        eyebrow="Member portal"
        title="Lab group"
        subtitle="Share updates, photos, files and voice notes with the whole lab."
        crumbs={[{ label: "Member portal", href: "/account" }, { label: "Lab group" }]}
      />
      <section className="pt-8 pb-16">
        <div className="container-page max-w-4xl">
          <ChatRoom
            initialMessages={messages}
            me={access.userId}
            staff={access.staff}
            title={`${settings.shortName || settings.labName} group`}
            className="h-[min(72vh,760px)]"
          />
          <Link href="/account" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
            <ArrowLeft className="size-4" /> Back to portal
          </Link>
        </div>
      </section>
    </>
  );
}
