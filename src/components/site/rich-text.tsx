import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/** Renders admin-authored HTML. Sanitised on save and again here. */
export function RichText({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
