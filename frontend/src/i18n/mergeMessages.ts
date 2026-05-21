import type { Messages } from './messages/en';
import { en } from './messages/en';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge locale overrides onto English defaults. */
export function mergeMessages(base: Messages, overrides: Partial<Messages> | Record<string, unknown>): Messages {
  const out = JSON.parse(JSON.stringify(base)) as Messages;
  function walk(target: Record<string, unknown>, source: Record<string, unknown>) {
    for (const key of Object.keys(source)) {
      const sv = source[key];
      if (isPlainObject(sv) && isPlainObject(target[key])) {
        walk(target[key] as Record<string, unknown>, sv);
      } else {
        target[key] = sv;
      }
    }
  }
  walk(out as unknown as Record<string, unknown>, overrides as unknown as Record<string, unknown>);
  return out;
}
