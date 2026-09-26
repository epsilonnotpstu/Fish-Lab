"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline, Undo2, Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadFile } from "./upload";

function Tool({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn("grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40", active && "bg-muted text-foreground")}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, /page, mailto:…)", prev ?? "https://");
    if (url === null) return;
    if (url === "") return void editor.chain().focus().unsetLink().run();
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return void toast.error("Links must start with https://, /, mailto: or tel:");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const id = toast.loading("Uploading image…");
      try {
        const src = await uploadFile(file, "image");
        editor.chain().focus().setImage({ src }).run();
        toast.success("Image inserted", { id });
      } catch (e) {
        toast.dismiss(id);
        const url = window.prompt(`${e instanceof Error ? e.message : "Upload failed"}\n\nPaste an image URL instead:`);
        if (url && /^https?:\/\//.test(url)) editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
      <Tool label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Tool>
      <Tool label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Tool>
      <span className="mx-1 h-5 w-px bg-border" />
      <Tool label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Tool>
      <Tool label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Tool>
      <Tool label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="size-4" /></Tool>
      <Tool label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></Tool>
      <Tool label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="size-4" /></Tool>
      <span className="mx-1 h-5 w-px bg-border" />
      <Tool label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Tool>
      <Tool label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Tool>
      <Tool label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Tool>
      <Tool label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Tool>
      <span className="mx-1 h-5 w-px bg-border" />
      <Tool label="Link" active={editor.isActive("link")} onClick={setLink}><Link2 className="size-4" /></Tool>
      <Tool label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="size-4" /></Tool>
      <Tool label="Image" onClick={addImage}><ImagePlus className="size-4" /></Tool>
      <span className="flex-1" />
      <Tool label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Tool>
      <Tool label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Tool>
    </div>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"] },
      }),
      Image,
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "rich-text min-h-[220px] px-4 py-3 focus:outline-none prose-sm sm:prose-base" },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-xl border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b" />}
      <EditorContent editor={editor} />
    </div>
  );
}
