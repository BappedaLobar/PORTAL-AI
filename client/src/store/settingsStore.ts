import { create } from 'zustand';
import type { AppSettings } from '../types';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  fetchSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  instansiName: 'Pemerintah Kabupaten',
  instansiAlamat: '',
  tahunAnggaran: new Date().getFullYear().toString(),
  penunjukanLangsungMaxNilai: 200_000_000,
  pengadaanLangsungMaxNilai: 50_000_000,
  zScoreThreshold: 2.5,
  iqrMultiplier: 1.5,
  suspiciousKeywords: [
    'studi banding', 'perjalanan dinas luar negeri', 'bimbingan teknis luar negeri',
    'workshop luar negeri', 'study tour', 'konsultasi fiktif'
  ],
  wasteKeywords: [
    'makan minum rapat', 'souvenir', 'cinderamata', 'dekorasi',
    'spanduk banner', 'baju seragam', 'karangan bunga'
  ],
  geminiModel: 'gemini-2.5-flash',
  aiProvider: 'gemini',
  anthropicModel: 'claude-3-7-sonnet-20250219',
  ollamaModel: 'llama3',
  ollamaBaseUrl: 'http://localhost:11434',
  customModel: 'gpt-4o-mini',
  customBaseUrl: '',
  customApiKey: '',
  analysisInstructions: 'Gunakan bahasa auditor profesional. Fokus pada deteksi mark-up, pemecahan paket (split tender), dan pemborosan anggaran. Jelaskan rincian penyebab risiko secara mendalam.',
  reportInstructions: 'Buat narasi laporan audit resmi dalam Bahasa Indonesia yang formal. Strukturkan dengan ringkasan eksekutif, temuan utama, dan rekomendasi strategis.',
};

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: defaultSettings,
  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings && Object.keys(data.settings).length > 0) {
        set({ settings: { ...defaultSettings, ...data.settings } });
      }
    } catch (e) {
      console.error("Failed to fetch settings from server", e);
    }
  },
  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error("Failed to save settings to server", e);
    }
  },
  resetSettings: async () => {
    set({ settings: defaultSettings });
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultSettings)
      });
    } catch (e) {
      console.error("Failed to reset settings on server", e);
    }
  }
}));
