import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { chatAccess, recentMessages } from "@/lib/chat";
import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/admin/page-title";
import { ChatRoom } from "@/components/chat/chat-room";

export const metadata: Metadata = { title: "Lab group" };

export default async function AdminChatPage() {
  await requireUser();
  const access = await chatAccess();
  const [messages, settings] = await Promise.all([recentMessages(), getSettings()]);

  return (
    <div>
      <PageTitle title="Lab group" description="The shared group with every approved member. You can remove any message." />
      <ChatRoom
        initialMessages={messages}
        me={access?.userId ?? ""}
        staff
        title={`${settings.shortName || settings.labName} group`}
        className="h-[calc(100dvh-12rem)]"
      />
    </div>
  );
}
