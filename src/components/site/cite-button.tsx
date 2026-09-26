"use client";

import { useState } from "react";
import { Check, Quote } from "lucide-react";

type Pub = { title: string; authors: string; venue: string; year: number; volume: string; pages: string; doi: string; type: string };

function bibtex(p: Pub) {
  const first = p.authors.split(/[,;]/)[0]?.trim().split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "") || "ref";
  const key = `${first.toLowerCase()}${p.year}`;
  const kind = p.type === "Book" ? "book" : p.type === "Conference Paper" ? "inproceedings" : p.type === "Thesis" ? "phdthesis" : "article";
  const venueField = kind === "inproceedings" ? "booktitle" : kind === "book" ? "publisher" : "journal";
  const fields = [
    ["title", p.title],
    ["author", p.authors.replace(/,\s*/g, " and ")],
    [venueField, p.venue],
    ["year", String(p.year)],
    ["volume", p.volume],
    ["pages", p.pages],
    ["doi", p.doi],
  ].filter(([, v]) => v);
  return `@${kind}{${key},\n${fields.map(([k, v]) => `  ${k} = {${v}}`).join(",\n")}\n}`;
}

export function CiteButton({ pub }: { pub: Pub }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(bibtex(pub));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute top-6 right-6 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted sm:top-7 sm:right-7"
      title="Copy BibTeX citation"
    >
      {copied ? <Check className="size-3.5 text-brand-accent" /> : <Quote className="size-3.5" />}
      {copied ? "Copied" : "BibTeX"}
    </button>
  );
}
