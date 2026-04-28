import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProgramPrioritas } from '../types';

interface PolicyState {
  priorities: ProgramPrioritas[];
  addPriority: (priority: Omit<ProgramPrioritas, 'id'>) => void;
  addPriorities: (priorities: Omit<ProgramPrioritas, 'id'>[]) => void;
  removePriority: (id: string) => void;
  updatePriority: (id: string, partial: Partial<ProgramPrioritas>) => void;
  clearPriorities: () => void;
}

export const usePolicyStore = create<PolicyState>()(
  persist(
    (set) => ({
      priorities: [],

      addPriority: (priority) =>
        set((state) => ({
          priorities: [
            ...state.priorities,
            { ...priority, id: crypto.randomUUID() },
          ],
        })),

      addPriorities: (newPriorities) =>
        set((state) => ({
          priorities: [
            ...state.priorities,
            ...newPriorities.map((p) => ({ ...p, id: crypto.randomUUID() })),
          ],
        })),

      removePriority: (id) =>
        set((state) => ({
          priorities: state.priorities.filter((p) => p.id !== id),
        })),

      updatePriority: (id, partial) =>
        set((state) => ({
          priorities: state.priorities.map((p) =>
            p.id === id ? { ...p, ...partial } : p
          ),
        })),

      clearPriorities: () => set({ priorities: [] }),
    }),
    { name: 'sirup-policies' }
  )
);
