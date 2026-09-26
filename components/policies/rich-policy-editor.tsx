"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react"
import { useEffect, useRef } from "react"

function legacyTextToHtml(content: string) {
  return content.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`).join("")
}

export function RichPolicyEditor({ value, contentFormat = "plain_text", onChange }: { value: string; contentFormat?: "plain_text" | "rich_text"; onChange: (value: string) => void }) {
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Link.configure({ openOnClick: false }), Underline],
    content: contentFormat === "rich_text" ? value : legacyTextToHtml(value),
    editorProps: { attributes: { class: "min-h-72 px-3 py-3 font-sans text-base font-normal leading-7 text-[#33413a] outline-none" } },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getHTML()),
  })
  if (!editor) return null
  const action = (label: string, run: () => void, active = false, icon?: React.ReactNode) => <button type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={run} className={`grid size-10 place-items-center border-r border-[#dbe2de] ${active ? "bg-[#eaf9f3] text-[#0d7d5f]" : "text-[#52605a] hover:bg-[#f1f5f3]"}`}>{icon}</button>
  return <div className="mt-1.5 overflow-hidden border border-[#d3dad7] bg-[#f8faf9] focus-within:border-[#0d7d5f]"><div className="flex flex-wrap border-b border-[#dbe2de] bg-white">{action("Undo", () => editor.chain().focus().undo().run(), false, <Undo2 className="size-4" />)}{action("Redo", () => editor.chain().focus().redo().run(), false, <Redo2 className="size-4" />)}{action("Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), <Bold className="size-4" />)}{action("Italic", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), <Italic className="size-4" />)}{action("Underline", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"), <UnderlineIcon className="size-4" />)}{action("Heading 2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), <Heading2 className="size-4" />)}{action("Heading 3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }), <Heading3 className="size-4" />)}{action("Bulleted list", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"), <List className="size-4" />)}{action("Numbered list", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), <ListOrdered className="size-4" />)}{action("Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), <Quote className="size-4" />)}{action("Add link", () => { const url = window.prompt("Link URL"); if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run() }, editor.isActive("link"), <Link2 className="size-4" />)}</div><EditorContent editor={editor} /></div>
}