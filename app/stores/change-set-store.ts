import { create } from "zustand";
import type { IssueType } from "~/data/delivery";

// A change set ties the work done for one issue together: which surfaces were
// touched and what changed. It is the bridge between issue tracking (Issues)
// and shipping (Releases) — its entries become the release changelog.
export interface ChangeEntry {
  id: string;
  surface: string; // human label of the builder surface (e.g. "Schema · Customer")
  summary: string;
  at: string;
}

export type ChangeSetStatus = "open" | "ready" | "released";

export interface ChangeSet {
  id: string;
  issueId: string;
  issueTitle: string;
  issueType: IssueType;
  status: ChangeSetStatus;
  changes: ChangeEntry[];
  startedAt: string;
}

function cid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 6)}`;
  }
  return `${prefix}_${Math.floor(performance.now()).toString(36)}`;
}

interface ChangeSetState {
  sets: ChangeSet[];
  /** the issue currently being worked on (drives the global FixBar) */
  activeIssueId: string | null;

  startFix: (issue: { id: string; title: string; type: IssueType }) => void;
  cancelFix: () => void;
  logChange: (surface: string, summary: string) => void;
  complete: (issueId: string) => void;
  getByIssue: (issueId: string) => ChangeSet | undefined;
  releasable: () => ChangeSet[];
  markReleased: (issueIds: string[]) => void;
}

export const useChangeSetStore = create<ChangeSetState>((set, get) => ({
  sets: [],
  activeIssueId: null,

  startFix: (issue) =>
    set((s) => {
      const existing = s.sets.find((cs) => cs.issueId === issue.id);
      if (existing) {
        return {
          activeIssueId: issue.id,
          sets: s.sets.map((cs) => (cs.issueId === issue.id ? { ...cs, status: "open" } : cs)),
        };
      }
      const cs: ChangeSet = {
        id: cid("cs"),
        issueId: issue.id,
        issueTitle: issue.title,
        issueType: issue.type,
        status: "open",
        changes: [],
        startedAt: "az önce",
      };
      return { activeIssueId: issue.id, sets: [cs, ...s.sets] };
    }),

  cancelFix: () => set({ activeIssueId: null }),

  logChange: (surface, summary) =>
    set((s) => {
      if (!s.activeIssueId) return s;
      return {
        sets: s.sets.map((cs) =>
          cs.issueId === s.activeIssueId
            ? { ...cs, changes: [...cs.changes, { id: cid("ch"), surface, summary, at: "az önce" }] }
            : cs,
        ),
      };
    }),

  complete: (issueId) =>
    set((s) => ({
      activeIssueId: null,
      sets: s.sets.map((cs) => (cs.issueId === issueId ? { ...cs, status: "ready" } : cs)),
    })),

  getByIssue: (issueId) => get().sets.find((cs) => cs.issueId === issueId),
  releasable: () => get().sets.filter((cs) => cs.status === "ready"),
  markReleased: (issueIds) =>
    set((s) => ({
      sets: s.sets.map((cs) => (issueIds.includes(cs.issueId) ? { ...cs, status: "released" } : cs)),
    })),
}));
