import { create } from "zustand";
import {
  SEED_DEPLOYMENTS,
  SEED_ENVIRONMENTS,
  type Deployment,
  type Environment,
  type EnvName,
  type PipelineStep,
} from "~/data/delivery";

function bump(version: string): string {
  // v1.8.0 -> v1.9.0 (mock minor bump)
  const m = version.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!m) return version + "+1";
  return `v${m[1]}.${Number(m[2]) + 1}.0`;
}

const ORDER: EnvName[] = ["dev", "staging", "prod"];

interface ReleaseState {
  environments: Environment[];
  deployments: Deployment[];
  deploy: (env: EnvName, changelog?: Deployment["changelog"]) => void;
  rollback: (deployId: string) => void;
}

let counter = 100;

export const useReleaseStore = create<ReleaseState>((set, get) => ({
  environments: SEED_ENVIRONMENTS,
  deployments: SEED_DEPLOYMENTS,

  deploy: (env, changelog = []) => {
    counter += 1;
    const id = `dpl_${counter.toString(16)}`;
    const target = get().environments.find((e) => e.name === env);
    const version = bump(target?.currentVersion ?? "v1.8.0");
    const steps: PipelineStep[] = [
      { name: "build", status: "running" },
      { name: "test", status: "pending" },
      { name: "deploy", status: "pending" },
    ];
    const deployment: Deployment = {
      id, version, env, status: "building", steps,
      triggeredBy: "you", time: "az önce", durationMs: 0,
      changelog, commit: Math.random().toString(16).slice(2, 9),
    };
    set((s) => ({
      deployments: [deployment, ...s.deployments],
      environments: s.environments.map((e) => (e.name === env ? { ...e, status: "deploying" } : e)),
    }));

    // Advance the pipeline over time (cleared implicitly when complete).
    const stages: { at: number; apply: () => void }[] = [
      { at: 700, apply: () => patch(set, id, { status: "testing", steps: mark(steps, 0, "passed", 1, "running") }) },
      { at: 1500, apply: () => patch(set, id, { status: "deploying", steps: mark(steps, 1, "passed", 2, "running") }) },
      { at: 2300, apply: () => {
        patch(set, id, { status: "success", durationMs: 149000, steps: mark(steps, 2, "passed") });
        set((s) => ({
          environments: s.environments.map((e) =>
            e.name === env ? { ...e, status: "healthy", currentVersion: version, lastDeploy: "az önce" } : e,
          ),
        }));
      } },
    ];
    stages.forEach((st) => window.setTimeout(st.apply, st.at));
  },

  rollback: (deployId) =>
    set((s) => {
      const dep = s.deployments.find((d) => d.id === deployId);
      if (!dep) return s;
      // restore the previous successful version on that env
      const prev = s.deployments.find(
        (d) => d.env === dep.env && d.status === "success" && d.id !== deployId,
      );
      return {
        deployments: s.deployments.map((d) => (d.id === deployId ? { ...d, status: "rolled-back" } : d)),
        environments: s.environments.map((e) =>
          e.name === dep.env && prev ? { ...e, currentVersion: prev.version, lastDeploy: "az önce" } : e,
        ),
      };
    }),
}));

// helpers
function patch(
  set: (fn: (s: ReleaseState) => Partial<ReleaseState>) => void,
  id: string,
  patchObj: Partial<Deployment>,
) {
  set((s) => ({ deployments: s.deployments.map((d) => (d.id === id ? { ...d, ...patchObj } : d)) }));
}

function mark(
  steps: PipelineStep[],
  i1: number,
  s1: PipelineStep["status"],
  i2?: number,
  s2?: PipelineStep["status"],
): PipelineStep[] {
  return steps.map((st, idx) => {
    if (idx === i1) return { ...st, status: s1, durationMs: 60000 };
    if (i2 !== undefined && idx === i2 && s2) return { ...st, status: s2 };
    return st;
  });
}

export { ORDER as ENV_ORDER };
