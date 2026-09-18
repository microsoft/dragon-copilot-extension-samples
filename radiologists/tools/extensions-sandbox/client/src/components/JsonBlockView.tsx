import type { JsonBlock } from '../preview';

/**
 * Fallback renderer for output the richer views cannot handle. Lives in its own
 * module because the Adaptive Card view — which is loaded on demand — also needs
 * it, and importing it from the pane would pull the pane into that chunk.
 */
export function JsonBlockView({ block }: { block: JsonBlock }) {
  const text = typeof block.json === 'string'
    ? block.json
    : JSON.stringify(block.json, null, 2);

  return (
    <section className="dc-preview-block dc-preview-json">
      {block.title && <h4 className="dc-preview-block-title">{block.title}</h4>}
      {block.reason && <p className="dc-preview-fallback-reason">{block.reason}</p>}
      <pre className="dark-code-block">{text}</pre>
    </section>
  );
}
