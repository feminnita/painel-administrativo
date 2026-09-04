import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
    Bold as BoldIcon,
    Italic as ItalicIcon,
    Heading2,
    Heading3,
    List,
    Minus,
    Link as LinkIcon,
} from "lucide-react";

type Props = {
    /** HTML atual do produto (pode ser HTML estruturado, texto puro, vazio ou null) */
    value: string | null | undefined;
    /** Recebe o HTML gerado pelo editor a cada alteração (editor.getHTML()) */
    onChange: (html: string) => void;
    placeholder?: string;
};

/**
 * Remove estilo embutido de colagens (Word/Bling): tira atributos style/class
 * e desembrulha <span>. O schema do Tiptap descarta o que sobra fora do suportado.
 */
function limparColagem(html: string): string {
    try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("*").forEach((el) => {
            el.removeAttribute("style");
            el.removeAttribute("class");
        });
        doc.querySelectorAll("span").forEach((span) => {
            const parent = span.parentNode;
            if (!parent) return;
            while (span.firstChild) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
        });
        return doc.body.innerHTML;
    } catch {
        return html;
    }
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
            }),
        ],
        // Abre os dois formatos do banco: HTML estruturado é parseado; texto puro
        // vira um parágrafo; vazio/null abre documento vazio.
        content: value || "",
        editorProps: {
            attributes: {
                class: "tiptap-content min-h-[150px] focus:outline-none",
            },
            transformPastedHTML: (html) => limparColagem(html),
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            // Tiptap devolve "<p></p>" para documento vazio; normaliza para "".
            onChange(html === "<p></p>" ? "" : html);
        },
    });

    // Sincroniza quando o produto editado muda (troca de produto sem remontar).
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        const incoming = value || "";
        const currentNorm = current === "<p></p>" ? "" : current;
        if (incoming !== currentNorm && incoming !== current) {
            editor.commands.setContent(incoming, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    if (!editor) return null;

    const setLink = () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL do link:", previous || "https://");
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    };

    const btn = (active: boolean) =>
        `rounded p-1.5 text-gray-600 hover:bg-gray-100 ${
            active ? "bg-gray-200 text-gray-900" : ""
        }`;

    return (
        <div className="rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
                <button
                    type="button"
                    title="Negrito"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={btn(editor.isActive("bold"))}
                >
                    <BoldIcon size={16} />
                </button>
                <button
                    type="button"
                    title="Itálico"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={btn(editor.isActive("italic"))}
                >
                    <ItalicIcon size={16} />
                </button>
                <span className="mx-1 h-5 w-px bg-gray-200" />
                <button
                    type="button"
                    title="Título H2"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={btn(editor.isActive("heading", { level: 2 }))}
                >
                    <Heading2 size={16} />
                </button>
                <button
                    type="button"
                    title="Título H3"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    className={btn(editor.isActive("heading", { level: 3 }))}
                >
                    <Heading3 size={16} />
                </button>
                <span className="mx-1 h-5 w-px bg-gray-200" />
                <button
                    type="button"
                    title="Lista com marcador"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={btn(editor.isActive("bulletList"))}
                >
                    <List size={16} />
                </button>
                <button
                    type="button"
                    title="Linha divisória"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className={btn(false)}
                >
                    <Minus size={16} />
                </button>
                <button
                    type="button"
                    title="Link"
                    onClick={setLink}
                    className={btn(editor.isActive("link"))}
                >
                    <LinkIcon size={16} />
                </button>
            </div>
            <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none p-3"
                data-placeholder={placeholder}
            />
        </div>
    );
}
