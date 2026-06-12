import { create } from "zustand";
import { SEED_MODULES } from "~/data/modules";

export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  active: boolean;
  installed: boolean;
  category: string;
  dependencies: string[];
  models: string[];
}

interface ModuleState {
  modules: ModuleDef[];
  toggle: (id: string) => void;
  install: (mod: ModuleDef) => void;
}

export const useModuleStore = create<ModuleState>((set) => ({
  modules: SEED_MODULES,
  toggle: (id) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === id ? { ...m, active: !m.active } : m,
      ),
    })),
  install: (mod) =>
    set((s) =>
      s.modules.some((m) => m.id === mod.id)
        ? s
        : { modules: [...s.modules, { ...mod, installed: true, active: true }] },
    ),
}));
