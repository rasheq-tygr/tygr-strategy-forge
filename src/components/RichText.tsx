import { renderRichHtml } from "../lib/richText";

type Props = {
  source: string;
  className?: string;
};

/** Renders Markdown / HTML body copy after sanitizing. */
export function RichText({ source, className = "article-rich" }: Props) {
  const html = renderRichHtml(source);
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
