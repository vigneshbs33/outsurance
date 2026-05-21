import type { Messages } from './messages/en';
import { messages } from './messages';
import type { AppLocale } from './config';

type Path = string;

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function translate(
  locale: AppLocale,
  path: Path,
  params?: Record<string, string | number>
): string {
  const dict = messages[locale] ?? messages.en;
  let raw = getByPath(dict as unknown as Record<string, unknown>, path);
  if (typeof raw !== 'string') {
    raw = getByPath(messages.en as unknown as Record<string, unknown>, path);
  }
  if (typeof raw !== 'string') return path;
  if (!params) return raw;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    raw
  );
}
