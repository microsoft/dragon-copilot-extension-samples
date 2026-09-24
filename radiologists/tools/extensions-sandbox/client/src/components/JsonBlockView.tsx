import type { JsonBlock } from '../preview';

/**
 * Fallback renderer for output the Report optimization card cannot show, and for
 * output Dragon Copilot would not display at all (flagged with a warning).
 */
export function JsonBlockView({ block }: { block: JsonBlock }) {
  const text = typeof block.json === 'string'
    ? block.json
    : JSON.stringify(block.json, null, 2);
  const reasonClass = block.reasonTone === 'warning'
    ? 'dc-preview-fallback-reason dc-preview-fallback-reason-warning'
    : 'dc-preview-fallback-reason';

  return (
    <section className="dc-preview-block dc-preview-json">
      {block.title && <h4 className="dc-preview-block-title">{block.title}</h4>}
      {block.reason && <p className={reasonClass}>{block.reason}</p>}
      <pre className="dark-code-block">{text}</pre>
    </section>
  );
}
