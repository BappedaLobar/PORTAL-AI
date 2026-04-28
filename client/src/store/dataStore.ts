import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RUPPackage, AnalysisProgress, DashboardStats } from '../types';
import { computeDashboardStats } from '../lib/risk-scorer';

interface DataState {
  packages: RUPPackage[];
  analyzedPackages: RUPPackage[];
  progress: AnalysisProgress;
  stats: DashboardStats | null;
  fileName: string | null;
  setPackages: (packages: RUPPackage[], fileName: string) => void;
  setAnalyzedPackages: (packages: RUPPackage[]) => void;
  setProgress: (progress: Partial<AnalysisProgress>) => void;
  setStats: (stats: DashboardStats) => void;
  fetchPackages: () => Promise<void>;
  clearData: () => void;
}

const defaultProgress: AnalysisProgress = {
  status: 'idle',
  progress: 0,
  message: 'Siap memproses data',
};

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      packages: [],
      analyzedPackages: [],
      progress: defaultProgress,
      stats: null,
      fileName: null,

      setPackages: (packages, fileName) => set({ packages, fileName }),

      setAnalyzedPackages: (packages) => set({ analyzedPackages: packages }),

      setProgress: (partial) =>
        set((state) => ({ progress: { ...state.progress, ...partial } })),

      setStats: (stats) => set({ stats }),

      fetchPackages: async () => {
        try {
          const res = await fetch('/api/packages');
          const data = await res.json();
          if (data.success) {
            const stats = computeDashboardStats(data.packages);
            set({ analyzedPackages: data.packages, packages: data.packages, stats });
          }
        } catch (error) {
          console.error('Failed to fetch packages:', error);
        }
      },

      clearData: () => {
        fetch('/api/packages', { method: 'DELETE' }).catch(console.error);
        set({
          packages: [],
          analyzedPackages: [],
          progress: defaultProgress,
          stats: null,
          fileName: null,
        });
      },
    }),
    {
      name: 'sirup-data-storage',
      partialize: (state) => ({ 
        fileName: state.fileName, 
        stats: state.stats,
        // we don't persist packages/analyzedPackages in localStorage anymore
      }),
    }
  )
);
