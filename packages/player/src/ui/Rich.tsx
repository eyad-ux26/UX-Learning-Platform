import type { Locale, Text } from "@uxgate/content/types";

const inline = (s: string) =>
  s.split(/(\*\*.+?\*\*)/g).map((part, i) => (part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));

/** Content text: a blank line starts a paragraph, "- " lines make a list, **bold** is supported. */
export function Rich({ text, locale, className }: { text: Text; locale: Locale; className?: string }) {
  return (
    <div className={className}>
      {text[locale].split(/\n\s*\n/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- ")))
          return <ul key={i} className="rich-list">{lines.map((l, k) => <li key={k}>{inline(l.slice(2))}</li>)}</ul>;
        return <p key={i} className="t-body">{inline(block)}</p>;
      })}
    </div>
  );
}
