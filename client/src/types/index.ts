// TypeScript interfaces for SIRUP Analyzer

export interface RUPPackage {
  id: string;
  namaInstansi: string;
  namaSatuanKerja: string;
  kodeKegiatan: string;
  caraPengadaan: string;
  metodePengadaan: string;
  jenisPengadaan: string;
  namaPaket: string;
  kodeRUP: string;
  sumberDana: string;
  produkDalamNegeri: string;
  totalNilai: number;
  // Computed
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskFlags?: RiskFlag[];
  aiAnalysis?: AIAnalysis;
}

export type RiskLevel = 'NORMAL' | 'SEDANG' | 'TINGGI' | 'KRITIS';
export type PolicyAlignment = 'SESUAI' | 'TIDAK_SESUAI' | 'PERLU_REVIEW';

export interface RiskFlag {
  type: 'STATISTICAL' | 'RULE' | 'AI';
  code: string;
  message: string;
  severity: RiskLevel;
  score: number;
}

export interface AIAnalysis {
  riskScore: number;
  riskLevel: RiskLevel;
  findings: string[];
  recommendations: string[];
  policyAlignment: PolicyAlignment;
  summary: string;
  markupIndicators: string[];
  wasteIndicators: string[];
}

export interface StatisticalResult {
  zScore?: number;
  isOutlier: boolean;
  percentile: number;
  categoryAvg: number;
  categoryMedian: number;
  benfordDeviation?: number;
  isSplitTender?: boolean;
}

export interface RiskBreakdown {
  statisticalScore: number;
  ruleScore: number;
  aiScore: number;
  totalScore: number;
  level: RiskLevel;
  flags: RiskFlag[];
}

export interface ProgramPrioritas {
  id: string;
  namaProgram: string;
  bidang: string;
  deskripsi?: string;
  anggaran?: number;
  keywords: string[];
}

export interface DashboardStats {
  totalPackages: number;
  totalValue: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  normalCount: number;
  suspiciousValue: number;
  criticalValue: number;
  skpdCount: number;
  analyzedAt?: Date;
}

export interface AnalysisProgress {
  status: 'idle' | 'parsing' | 'statistical' | 'rules' | 'scoring' | 'done' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface ExportOptions {
  format: 'excel' | 'pdf';
  riskLevels: RiskLevel[];
  skpd?: string;
  includeAI: boolean;
  reportType: 'summary' | 'detail' | 'executive';
}

export interface AppSettings {
  theme: 'light' | 'dark';
  instansiName: string;
  instansiAlamat: string;
  tahunAnggaran: string;
  // Rule thresholds
  penunjukanLangsungMaxNilai: number;
  pengadaanLangsungMaxNilai: number;
  zScoreThreshold: number;
  iqrMultiplier: number;
  // Keywords
  suspiciousKeywords: string[];
  wasteKeywords: string[];
  geminiModel: string;
  aiProvider: 'gemini' | 'ollama' | 'anthropic' | 'custom';
  anthropicModel: string;
  ollamaModel: string;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string;
  customModel?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  analysisInstructions: string;
  reportInstructions: string;
}
