import { create } from "zustand";
import {
  SEED_ISSUES,
  type Issue,
  type IssueStatus,
  type IssueSeverity,
  type IssueComment,
  type RoadmapStage,
} from "~/data/delivery";

function iid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 6);
  }
  return Math.floor(performance.now()).toString(36);
}

interface IssueState {
  issues: Issue[];
  setStatus: (id: string, status: IssueStatus) => void;
  setSeverity: (id: string, severity: IssueSeverity) => void;
  assign: (id: string, who: string | null) => void;
  addComment: (id: string, comment: Omit<IssueComment, "id">) => void;
  applyAiTriage: (id: string) => void;
  upvote: (id: string) => void;
  setStage: (id: string, stage: RoadmapStage) => void;
  /** create a new bug from a customer report or an error group */
  submitReport: (partial: Partial<Issue> & { title: string }) => string;
}

let bugCounter = 143;

export const useIssueStore = create<IssueState>((set) => ({
  issues: SEED_ISSUES,

  setStatus: (id, status) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status } : i)) })),
  setSeverity: (id, severity) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, severity } : i)) })),
  assign: (id, who) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, assignee: who } : i)) })),

  addComment: (id, comment) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, comments: [...i.comments, { id: iid(), ...comment }] } : i,
      ),
    })),

  applyAiTriage: (id) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id && i.aiSuggested
          ? {
              ...i,
              severity: i.aiSuggested.severity ?? i.severity,
              assignee: i.aiSuggested.assignee ?? i.assignee,
              status: i.status === "triage" ? "in-progress" : i.status,
            }
          : i,
      ),
    })),

  upvote: (id) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, votes: i.votes + 1 } : i)) })),
  setStage: (id, stage) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, stage } : i)) })),

  submitReport: (partial) => {
    bugCounter += 1;
    const id = partial.id ?? `BUG-${bugCounter}`;
    const issue: Issue = {
      id,
      type: "bug",
      title: partial.title,
      description: partial.description ?? "",
      severity: partial.severity ?? "medium",
      status: "triage",
      source: partial.source ?? "in-app",
      reporter: partial.reporter ?? "müşteri",
      assignee: null,
      linkedModel: partial.linkedModel,
      linkedModule: partial.linkedModule,
      votes: 0,
      createdAt: "az önce",
      comments: partial.description
        ? [{ id: iid(), author: partial.reporter ?? "müşteri", authorKind: "customer", body: partial.description, time: "az önce" }]
        : [],
      aiSuggested: partial.aiSuggested,
    };
    set((s) => ({ issues: [issue, ...s.issues] }));
    return id;
  },
}));
