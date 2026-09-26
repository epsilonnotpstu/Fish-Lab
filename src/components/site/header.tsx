"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LabLogo, type Brand } from "./lab-logo";
import { ThemeToggle } from "./theme-toggle";
import { SearchDialog } from "./search-dialog";

export type NavLink = {
  id: string;
  label: string;
  href: string;
  newTab: boolean;
  children: { id: string; label: string; href: string; newTab: boolean }[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return href !== "#" && (pathname === href || pathname.startsWith(`${href}/`));
}

export function Header({
  brand,
  nav,
  overlayOnHome,
  hasAnnouncement,
}: {
  brand: Brand;
  nav: NavLink[];
  overlayOnHome: boolean;
  hasAnnouncement: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus when navigating.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Every page opens on a dark hero, so the header starts transparent/light
  // and turns solid once the visitor scrolls.
  const transparent = !scrolled && !mobileOpen && (pathname !== "/" || overlayOnHome);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 z-50 transition-all duration-300",
          hasAnnouncement && !scrolled ? "top-10" : "top-0",
          transparent ? "bg-transparent" : "glass border-b border-border/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]",
        )}
      >
        <div className="container-page flex h-[72px] items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label={`${brand.labName} home`}>
            <LabLogo brand={brand} light={transparent} />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((item) =>
              item.children.length ? (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.id)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    type="button"
                    aria-expanded={openMenu === item.id}
                    onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition",
                      transparent ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                      item.children.some((c) => isActive(pathname, c.href)) && (transparent ? "text-white" : "text-foreground"),
                    )}
                  >
                    {item.label}
                    <ChevronDown className={cn("size-3.5 transition-transform", openMenu === item.id && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {openMenu === item.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-1/2 w-56 -translate-x-1/2 pt-2"
                      >
                        <div className="overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-xl">
                          {item.children.map((c) => (
                            <Link
                              key={c.id}
                              href={c.href}
                              target={c.newTab ? "_blank" : undefined}
                              rel={c.newTab ? "noopener noreferrer" : undefined}
                              className={cn(
                                "block rounded-xl px-3.5 py-2.5 text-sm transition hover:bg-muted",
                                isActive(pathname, c.href) ? "font-semibold text-brand dark:text-brand-accent" : "text-popover-foreground",
                              )}
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.newTab ? "_blank" : undefined}
                  rel={item.newTab ? "noopener noreferrer" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition",
                    transparent ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    isActive(pathname, item.href) && (transparent ? "bg-white/10 text-white" : "bg-muted text-foreground"),
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition sm:flex",
                transparent ? "border-white/20 text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Search className="size-4" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="hidden rounded border border-current/20 px-1.5 font-mono text-[10px] opacity-70 xl:inline">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className={cn("grid size-9 place-items-center rounded-full sm:hidden", transparent ? "text-white hover:bg-white/10" : "hover:bg-muted")}
            >
              <Search className="size-[18px]" />
            </button>
            <ThemeToggle className={transparent ? "text-white hover:bg-white/10" : "hover:bg-muted"} />
            <Link
              href="/account"
              aria-label="Member portal"
              title="Member portal"
              className={cn("grid size-9 place-items-center rounded-full transition", transparent ? "text-white hover:bg-white/10" : "hover:bg-muted")}
            >
              <UserRound className="size-[18px]" />
            </Link>
            <button
              type="button"
              className={cn("grid size-10 place-items-center rounded-full lg:hidden", transparent ? "text-white hover:bg-white/10" : "hover:bg-muted")}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "calc(100dvh - 72px)" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-y-auto border-t bg-background lg:hidden"
              aria-label="Mobile"
            >
              <div className="container-page flex flex-col gap-1 py-6">
                {nav.map((item) => (
                  <div key={item.id}>
                    {item.children.length ? (
                      <>
                        <p className="px-3 pt-4 pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          {item.label}
                        </p>
                        {item.children.map((c) => (
                          <Link
                            key={c.id}
                            href={c.href}
                            className={cn(
                              "block rounded-xl px-3 py-3 text-lg font-medium transition hover:bg-muted",
                              isActive(pathname, c.href) && "text-brand dark:text-brand-accent",
                            )}
                          >
                            {c.label}
                          </Link>
                        ))}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "block rounded-xl px-3 py-3 text-lg font-medium transition hover:bg-muted",
                          isActive(pathname, item.href) && "text-brand dark:text-brand-accent",
                        )}
                      >
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
