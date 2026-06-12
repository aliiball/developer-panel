import { create } from "zustand";
import type { AIPreview } from "~/lib/ai-mock";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  preview?: AIPreview;
  streaming?: boolean;
}

interface CopilotState {
  /** right rail open/closed */
  railOpen: boolean;
  /** messages shown in the rail mini-chat */
  messages: ChatMessage[];
  /** a prompt queued from Spotlight / quick replies, consumed by the rail */
  queuedPrompt: string | null;

  openRail: () => void;
  closeRail: () => void;
  toggleRail: () => void;
  queuePrompt: (prompt: string) => void;
  consumeQueued: () => string | null;
  pushMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clear: () => void;
}

let n = 0;
export function msgId(): string {
  n += 1;
  return `msg_${n}`;
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  railOpen: false,
  messages: [],
  queuedPrompt: null,

  openRail: () => set({ railOpen: true }),
  closeRail: () => set({ railOpen: false }),
  toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),

  queuePrompt: (prompt) => set({ queuedPrompt: prompt, railOpen: true }),
  consumeQueued: () => {
    const q = get().queuedPrompt;
    if (q) set({ queuedPrompt: null });
    return q;
  },

  pushMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  clear: () => set({ messages: [] }),
}));
