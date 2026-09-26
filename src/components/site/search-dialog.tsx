"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, FlaskConical, Loader2, Newspaper, Search, Users, Briefcase } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchHit } from "@/app/api/search/route";

const ICONS: Record<string, typeof Search> = {
  Research: FlaskConical,
  People: Users,
  News: Newspaper,
  Publications: BookOpen,
  Projects: Briefcase,
  Pages: FileText,
};

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results: SearchHit[] };
        setResults(data.results ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const visible = query.trim().length < 2 ? [] : results;
  const groups = visible.reduce<Record<string, SearchHit[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search the website" className="sm:max-w-xl">
      <Command shouldFilter={false}>
      <CommandInput placeholder="Search research, people, news, publications…" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[60vh]">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </div>
        )}
        {!loading && query.trim().length >= 2 && <CommandEmpty>No results for “{query}”.</CommandEmpty>}
        {!loading && query.trim().length < 2 && (
          <div className="py-8 text-center text-sm text-muted-foreground">Type at least two characters to search.</div>
        )}
        {Object.entries(groups).map(([type, hits]) => {
          const Icon = ICONS[type] ?? Search;
          return (
            <CommandGroup key={type} heading={type}>
              {hits.map((hit) => (
                <CommandItem
                  key={hit.href + hit.title}
                  value={hit.href + hit.title}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(hit.href);
                  }}
                >
                  <Icon className="text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{hit.title}</p>
                    {hit.subtitle && <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
