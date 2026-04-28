import type { RUPPackage, RiskFlag } from '../types';
import type { AppSettings } from '../types';

// Method thresholds based on Perpres 16/2018
const METHOD_RULES = [
  {
    code: 'PENUNJUKAN_LANGSUNG_OVER',
    check: (p: RUPPackage, s: AppSettings) =>
      p.metodePengadaan?.toLowerCase().includes('penunjukan langsung') &&
      p.totalNilai > s.penunjukanLangsungMaxNilai,
    message: (p: RUPPackage, s: AppSettings) =>
      `Metode Penunjukan Langsung digunakan untuk nilai Rp ${p.totalNilai.toLocaleString('id-ID')} yang melebihi batas Rp ${s.penunjukanLangsungMaxNilai.toLocaleString('id-ID')}`,
    severity: 'KRITIS' as const,
    score: 45,
  },
  {
    code: 'PENGADAAN_LANGSUNG_OVER',
    check: (p: RUPPackage, s: AppSettings) =>
      p.metodePengadaan?.toLowerCase().includes('pengadaan langsung') &&
      p.totalNilai > s.pengadaanLangsungMaxNilai,
    message: (p: RUPPackage, s: AppSettings) =>
      `Metode Pengadaan Langsung digunakan untuk nilai Rp ${p.totalNilai.toLocaleString('id-ID')} yang melebihi batas Rp ${s.pengadaanLangsungMaxNilai.toLocaleString('id-ID')}`,
    severity: 'TINGGI' as const,
    score: 35,
  },
  {
    code: 'NON_LELANG_HIGH_VALUE',
    check: (p: RUPPackage) => {
      const isNonLelang = !p.metodePengadaan?.toLowerCase().includes('lelang') &&
        !p.metodePengadaan?.toLowerCase().includes('tender');
      return isNonLelang && p.totalNilai > 500_000_000;
    },
    message: (p: RUPPackage) =>
      `Paket senilai Rp ${p.totalNilai.toLocaleString('id-ID')} dilaksanakan tanpa lelang/tender`,
    severity: 'TINGGI' as const,
    score: 30,
  },
  {
    code: 'E_PURCHASING_MANIPULATION',
    check: (p: RUPPackage) =>
      p.metodePengadaan?.toLowerCase().includes('e-purchasing') &&
      p.totalNilai > 1_000_000_000,
    message: (p: RUPPackage) =>
      `E-Purchasing untuk nilai sangat besar (Rp ${p.totalNilai.toLocaleString('id-ID')}) perlu verifikasi kewajaran`,
    severity: 'SEDANG' as const,
    score: 20,
  },
];

// Keyword-based rules
const KEYWORD_RULES = [
  {
    code: 'SUSPICIOUS_ACTIVITY',
    keywords: ['studi banding', 'study tour', 'perjalanan dinas luar negeri', 'bimbingan teknis luar negeri'],
    severity: 'TINGGI' as const,
    score: 30,
    label: 'Kegiatan Perjalanan Tidak Esensial',
  },
  {
    code: 'WASTE_INDICATOR',
    keywords: ['souvenir', 'cinderamata', 'dekorasi', 'karangan bunga', 'bunga papan', 'hiasan'],
    severity: 'SEDANG' as const,
    score: 20,
    label: 'Potensi Pemborosan',
  },
  {
    code: 'LUXURY_GOODS',
    keywords: ['mewah', 'premium', 'vip', 'luxury', 'exclusive', 'eksklusif'],
    severity: 'TINGGI' as const,
    score: 35,
    label: 'Barang/Jasa Mewah',
  },
  {
    code: 'FICTITIOUS_INDICATOR',
    keywords: ['konsultasi fiktif', 'kegiatan fiktif', 'pekerjaan fiktif'],
    severity: 'KRITIS' as const,
    score: 50,
    label: 'Indikasi Kegiatan Fiktif',
  },
  {
    code: 'MONITORING_EVALUATION',
    keywords: ['monitoring evaluasi', 'monev', 'rapat koordinasi', 'rakor', 'workshop', 'bimtek'],
    severity: 'SEDANG' as const,
    score: 15,
    label: 'Kegiatan Non-Produktif Berulang',
  },
];

// High value thresholds
const VALUE_RULES = [
  {
    code: 'VERY_HIGH_VALUE',
    check: (p: RUPPackage) => p.totalNilai >= 10_000_000_000,
    message: (p: RUPPackage) => `Nilai paket sangat besar (Rp ${p.totalNilai.toLocaleString('id-ID')}) — butuh pengawasan ekstra`,
    severity: 'TINGGI' as const,
    score: 25,
  },
  {
    code: 'FOREIGN_PRODUCT_HIGH',
    check: (p: RUPPackage) =>
      p.produkDalamNegeri?.toLowerCase() === 'tidak' && p.totalNilai > 100_000_000,
    message: (p: RUPPackage) =>
      `Pengadaan produk luar negeri (Rp ${p.totalNilai.toLocaleString('id-ID')}) — verifikasi kebutuhan dan kewajaran`,
    severity: 'SEDANG' as const,
    score: 15,
  },
  {
    code: 'NEAR_THRESHOLD',
    check: (p: RUPPackage) => {
      const thresholds = [50_000_000, 200_000_000, 500_000_000, 2_500_000_000];
      return thresholds.some(t => p.totalNilai >= t * 0.90 && p.totalNilai <= t);
    },
    message: (p: RUPPackage) =>
      `Nilai paket (Rp ${p.totalNilai.toLocaleString('id-ID')}) mendekati batas threshold pengadaan — indikasi pemecahan atau pembatasan nilai`,
    severity: 'SEDANG' as const,
    score: 20,
  },
];

export function runRuleEngine(
  packages: RUPPackage[],
  settings: AppSettings,
  customSuspiciousKeywords: string[] = [],
  customWasteKeywords: string[] = []
): Map<string, { flags: RiskFlag[]; score: number }> {
  const resultMap = new Map<string, { flags: RiskFlag[]; score: number }>();

  // Merge custom keywords
  const allSuspiciousKeywords = [
    ...KEYWORD_RULES.find(r => r.code === 'SUSPICIOUS_ACTIVITY')!.keywords,
    ...settings.suspiciousKeywords,
    ...customSuspiciousKeywords,
  ];

  packages.forEach(pkg => {
    const flags: RiskFlag[] = [];
    let score = 0;
    const nameLower = (pkg.namaPaket || '').toLowerCase();

    // Method rules
    METHOD_RULES.forEach(rule => {
      if (rule.check(pkg, settings)) {
        flags.push({
          type: 'RULE',
          code: rule.code,
          message: rule.message(pkg, settings),
          severity: rule.severity,
          score: rule.score,
        });
        score += rule.score;
      }
    });

    // Keyword rules
    KEYWORD_RULES.forEach(rule => {
      const keywords = rule.code === 'SUSPICIOUS_ACTIVITY' ? allSuspiciousKeywords : rule.keywords;
      const matched = keywords.filter(kw => nameLower.includes(kw.toLowerCase()));
      if (matched.length > 0) {
        flags.push({
          type: 'RULE',
          code: rule.code,
          message: `${rule.label}: Ditemukan kata kunci "${matched[0]}" pada nama paket`,
          severity: rule.severity,
          score: rule.score,
        });
        score += rule.score;
      }
    });

    // Custom waste keywords
    const wasteMatched = [...settings.wasteKeywords, ...customWasteKeywords].filter(
      kw => nameLower.includes(kw.toLowerCase())
    );
    if (wasteMatched.length > 0) {
      flags.push({
        type: 'RULE',
        code: 'CUSTOM_WASTE',
        message: `Indikasi pemborosan: ditemukan kata kunci "${wasteMatched[0]}"`,
        severity: 'SEDANG',
        score: 20,
      });
      score += 20;
    }

    // Value rules
    VALUE_RULES.forEach(rule => {
      if (rule.check(pkg)) {
        flags.push({
          type: 'RULE',
          code: rule.code,
          message: rule.message(pkg),
          severity: rule.severity,
          score: rule.score,
        });
        score += rule.score;
      }
    });

    resultMap.set(pkg.id, { flags, score: Math.min(100, score) });
  });

  return resultMap;
}
