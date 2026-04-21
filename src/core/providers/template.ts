// Mustache-style {{variable}} interpolation — supports dot-paths like {{user.name}}.
// Unknown keys render as empty string (Mustache default). We deliberately do NOT
// escape HTML: prompts go to LLMs, not browsers.
const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(VAR_RE, (_match, path: string) => {
    const val = lookup(vars, path);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

function lookup(obj: Record<string, unknown>, dotted: string): unknown {
  const parts = dotted.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
