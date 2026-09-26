"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, KeyRound, LogOut, Menu, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { initials } from "@/lib/format";
import { SidebarNav, type NavGroup } from "./sidebar";

export function Topbar({
  user,
  groups,
  brandSlot,
}: {
  user: { name: string; email: string; role: string };
  groups: NavGroup[];
  brandSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b border-sidebar-border px-5">{brandSlot}</div>
          <SidebarNav groups={groups} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
        <Link href="/" target="_blank"><ExternalLink /> View site</Link>
      </Button>
      <ThemeToggle className="hover:bg-muted" />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition hover:bg-muted">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-xs font-bold text-white">
            {initials(user.name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm leading-tight font-medium">{user.name}</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">{user.role === "SUPER_ADMIN" ? "Super admin" : "Editor"}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/admin/account"><UserRound /> My account</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/admin/account#password"><KeyRound /> Change password</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <DropdownMenuItem asChild variant="destructive">
              <button type="submit" className="w-full"><LogOut /> Sign out</button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
