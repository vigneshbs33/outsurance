import type { Plan } from '../components/StressTestModal';

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUsed?: string;
  comparePlans?: Plan[];
  comparisonTable?: Record<string, Record<string, string>>;
};

export type StoredChatState = {
  messages: StoredChatMessage[];
  compareOffset: number;
  savedAt: string;
};

function storageKey(userId: string) {
  return `outsurance_agent_chat_${userId}`;
}

export function loadAgentChatState(userId: string): StoredChatState | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChatState;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAgentChatState(
  userId: string,
  messages: StoredChatMessage[],
  compareOffset: number
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const payload: StoredChatState = {
      messages,
      compareOffset,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearAgentChatState(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  sessionStorage.removeItem(storageKey(userId));
}
