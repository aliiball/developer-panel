import { create } from "zustand";
import type { AIPreview } from "~/lib/ai-mock";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  preview?: AIPreview;
  streaming?: boolean;
}

// History of every copilot generation — powers the AI Agent Runs surface.
export interface AgentRun {
  id: string;
  prompt: string;
  surface: string; // route pathname where it was triggered
  outcome: "text" | "preview";
  previewKind?: string;
  at: string;
  durationMs: number;
}

interface CopilotState {
  /** right rail open/closed */
  railOpen: boolean;
  /** messages shown in the rail mini-chat */
  messages: ChatMessage[];
  /** a prompt queued from Spotlight / quick replies, consumed by the rail */
  queuedPrompt: string | null;
  /** log of every generation, newest first */
  runs: AgentRun[];

  openRail: () => void;
  closeRail: () => void;
  toggleRail: () => void;
  queuePrompt: (prompt: string) => void;
  consumeQueued: () => string | null;
  pushMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  recordRun: (run: Omit<AgentRun, "id" | "at">) => void;
  clear: () => void;
}

let n = 0;
export function msgId(): string {
  n += 1;
  return `msg_${n}`;
}

let runN = 0;

const SEED_RUNS: AgentRun[] = [
  { id: "run_seed1", prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.", surface: "/ai-copilot", outcome: "preview", previewKind: "models", at: "1 sa önce", durationMs: 1400 },
  { id: "run_seed2", prompt: "Customer modeline fiyat ve stok ekle.", surface: "/schema/customer", outcome: "preview", previewKind: "fields", at: "3 sa önce", durationMs: 900 },
  { id: "run_seed3", prompt: "WCAG AA uyumlu marka paleti oluştur.", surface: "/theme", outcome: "preview", previewKind: "palette", at: "5 sa önce", durationMs: 1100 },
  { id: "run_seed4", prompt: "Bu workspace'te bu hafta ne değişti?", surface: "/", outcome: "text", at: "1 gün önce", durationMs: 600 },
];

export const useCopilotStore = create<CopilotState>((set, get) => ({
  railOpen: false,
  messages: [],
  queuedPrompt: null,
  runs: SEED_RUNS,

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
  recordRun: (run) => {
    runN += 1;
    set((s) => ({ runs: [{ id: `run_${runN}`, at: "az önce", ...run }, ...s.runs] }));
  },
  clear: () => set({ messages: [] }),
}));
