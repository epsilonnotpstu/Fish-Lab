"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

export type NavGroup = { label: string; items: { href: string; label: string; icon: string; badge?: number }[] };

export function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active(item.href)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon
                    name={item.icon}
                    className={cn("size-4 shrink-0", active(item.href) ? "text-sidebar-primary" : "opacity-70 group-hover:opacity-100")}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] leading-none font-bold text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="px-3">
        <Link href="/" target="_blank" className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground">
          <ExternalLink className="size-3.5" /> View website
        </Link>
      </div>
    </nav>
  );
}
