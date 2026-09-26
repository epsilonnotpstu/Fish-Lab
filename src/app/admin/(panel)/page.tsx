import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, FlaskConical, Inbox, Mail, Newspaper, Plus, ShieldAlert, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const [settings, members, research, news, pubs, unread, messages, activity, events, pending] = await Promise.all([
    getSettings(),
    db.member.count({ where: { isAlumni: false } }),
    db.researchArea.count(),
    db.newsPost.count(),
    db.publication.count(),
    db.contactMessage.count({ where: { read: false } }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.event.findMany({ where: { startDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 3 }),
    db.member.count({ where: { status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Members", value: members, icon: Users, href: "/admin/members" },
    { label: "Research areas", value: research, icon: FlaskConical, href: "/admin/research" },
    { label: "News posts", value: news, icon: Newspaper, href: "/admin/news" },
    { label: "Publications", value: pubs, icon: BookOpen, href: "/admin/publications" },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {denied && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="size-5" /> You do not have permission to open that page.
        </div>
      )}
      <div className="bg-ocean relative overflow-hidden rounded-2xl p-6 text-white sm:p-8">
        <div className="bg-grid absolute inset-0 text-white opacity-20" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-white/60">{formatDate(new Date(), "EEEE, MMMM d")}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting}, {user.name.split(" ")[0]}</h1>
            <p className="mt-2 text-white/70">Here is what is happening on the {settings.shortName || settings.labName} website.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="bg-brand-accent text-accent-fg hover:bg-brand-accent/90"><Link href="/admin/news/new"><Plus /> News post</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link href="/admin/publications/new"><Plus /> Publication</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link href="/admin/members/new"><Plus /> Member</Link></Button>
          </div>
        </div>
      </div>

      {pending > 0 && (
        <Link href="/admin/approvals" className="flex items-center gap-3 rounded-xl border border-brand-accent/40 bg-accent p-4 text-sm text-accent-foreground transition hover:shadow-md">
          <Users className="size-5" />
          <span>
            <strong>{pending} member {pending === 1 ? "request" : "requests"}</strong> waiting for review.
          </span>
          <ArrowRight className="ml-auto size-4" />
        </Link>
      )}

      {!cloudinaryConfigured() && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <strong>Image uploads are not configured.</strong> Add <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> to your environment to enable drag-and-drop uploads. Until then you can paste image URLs.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="transition group-hover:shadow-md">
              <CardContent className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Inbox className="size-4" /> Recent messages {unread > 0 && <Badge>{unread} new</Badge>}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/messages">View all <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <ul className="divide-y">
                {messages.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/messages?id=${m.id}`} className="flex items-start gap-3 py-3 transition hover:bg-muted/50">
                      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Mail className="size-4 text-muted-foreground" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm">
                          <span className={m.read ? "font-medium" : "font-bold"}>{m.name}</span>
                          {!m.read && <span className="size-2 rounded-full bg-brand-accent" />}
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(m.createdAt, "MMM d")}</span>
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{m.subject || m.message}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}`} className="flex gap-3 rounded-lg p-2 transition hover:bg-muted">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-primary py-1.5 text-primary-foreground">
                        <span className="text-[10px] uppercase">{formatDate(e.startDate, "MMM")}</span>
                        <span className="text-lg leading-none font-bold">{formatDate(e.startDate, "dd")}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{e.location}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <Badge variant="secondary" className="capitalize">{a.action}</Badge>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{a.user?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.entity}{a.summary ? ` — ${a.summary}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.createdAt, "MMM d, HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
