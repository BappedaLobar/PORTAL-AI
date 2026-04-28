import type { RUPPackage, RiskFlag, StatisticalResult } from '../types';
import type { AppSettings } from '../types';

// Helper: Calculate Z-Score
function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

// Helper: Calculate mean
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Helper: Calculate standard deviation
function stdDev(values: number[], avg?: number): number {
  const m = avg ?? mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Helper: Calculate percentile rank
function percentileRank(values: number[], value: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

// Helper: Calculate IQR bounds
function iqrBounds(values: number[], multiplier: number): { lower: number; upper: number; q1: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return {
    q1, q3,
    lower: q1 - multiplier * iqr,
    upper: q3 + multiplier * iqr,
  };
}

// Benford's Law expected distribution
const BENFORD_EXPECTED = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function benfordDeviation(values: number[]): number {
  const firstDigits: number[] = values
    .filter(v => v > 0)
    .map(v => parseInt(String(Math.abs(v)).replace(/^0\.0*/, '')[0]) || 0)
    .filter(d => d >= 1 && d <= 9);

  if (firstDigits.length < 10) return 0;

  const counts = Array(10).fill(0);
  firstDigits.forEach(d => counts[d]++);
  const actual = counts.map(c => c / firstDigits.length);

  const deviation = BENFORD_EXPECTED.slice(1).reduce((sum, expected, i) => {
    return sum + Math.abs(actual[i + 1] - expected);
  }, 0);

  return Math.round(deviation * 100); // 0-100 scale deviation score
}

// Detect split tender (similar names, same SKPD, similar values)
function detectSplitTender(pkg: RUPPackage, allPackages: RUPPackage[]): boolean {
  const sameSKPD = allPackages.filter(
    p => p.id !== pkg.id && p.namaSatuanKerja === pkg.namaSatuanKerja
  );

  const threshold = 50_000_000; // 50 juta
  const valueRange = 0.3; // 30% similarity

  const similarValue = sameSKPD.filter(p => {
    const diff = Math.abs(p.totalNilai - pkg.totalNilai) / (pkg.totalNilai || 1);
    return diff <= valueRange && pkg.totalNilai <= threshold;
  });

  if (similarValue.length < 2) return false;

  // Check name similarity (basic keyword overlap)
  const pkgWords = new Set(pkg.namaPaket.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  const nameSimilar = similarValue.filter(p => {
    const pWords = p.namaPaket.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const overlap = pWords.filter(w => pkgWords.has(w)).length;
    return overlap >= 2;
  });

  return nameSimilar.length >= 1;
}

// Main statistical analysis function
export function runStatisticalAnalysis(
  packages: RUPPackage[],
  settings: AppSettings
): Map<string, { result: StatisticalResult; flags: RiskFlag[]; score: number }> {
  const resultMap = new Map<string, { result: StatisticalResult; flags: RiskFlag[]; score: number }>();

  // Group by jenis pengadaan for category comparison
  const byJenis = new Map<string, RUPPackage[]>();
  packages.forEach(pkg => {
    const key = pkg.jenisPengadaan || 'Lainnya';
    if (!byJenis.has(key)) byJenis.set(key, []);
    byJenis.get(key)!.push(pkg);
  });

  // Global Benford deviation
  const allValues = packages.map(p => p.totalNilai).filter(v => v > 0);
  const globalBenford = benfordDeviation(allValues);

  packages.forEach(pkg => {
    const flags: RiskFlag[] = [];
    let score = 0;

    const categoryPkgs = byJenis.get(pkg.jenisPengadaan || 'Lainnya') || [];
    const categoryValues = categoryPkgs.map(p => p.totalNilai).filter(v => v > 0);

    const categoryMean = mean(categoryValues);
    const categoryStd = stdDev(categoryValues, categoryMean);
    const z = zScore(pkg.totalNilai, categoryMean, categoryStd);
    const pctile = percentileRank(categoryValues, pkg.totalNilai);

    // IQR Analysis
    const iqr = iqrBounds(categoryValues, settings.iqrMultiplier);
    const isIQROutlier = pkg.totalNilai > iqr.upper;

    // Z-Score Flag
    if (Math.abs(z) > settings.zScoreThreshold) {
      const severity = Math.abs(z) > 4 ? 'KRITIS' : Math.abs(z) > 3 ? 'TINGGI' : 'SEDANG';
      const flagScore = Math.min(40, Math.round(Math.abs(z) * 8));
      flags.push({
        type: 'STATISTICAL',
        code: 'Z_SCORE_OUTLIER',
        message: `Nilai paket menyimpang ${z.toFixed(1)}σ dari rata-rata kategori ${pkg.jenisPengadaan} (Rata-rata: Rp ${categoryMean.toLocaleString('id-ID')})`,
        severity,
        score: flagScore,
      });
      score += flagScore;
    }

    // IQR Outlier Flag
    if (isIQROutlier) {
      const flagScore = Math.min(30, Math.round(((pkg.totalNilai - iqr.upper) / iqr.upper) * 50));
      flags.push({
        type: 'STATISTICAL',
        code: 'IQR_OUTLIER',
        message: `Nilai paket (Rp ${pkg.totalNilai.toLocaleString('id-ID')}) melebihi batas IQR atas (Rp ${iqr.upper.toLocaleString('id-ID')})`,
        severity: 'SEDANG',
        score: Math.max(10, flagScore),
      });
      score += Math.max(10, flagScore);
    }

    // Percentile Flag (top 5%)
    if (pctile >= 95 && categoryValues.length > 10) {
      flags.push({
        type: 'STATISTICAL',
        code: 'HIGH_PERCENTILE',
        message: `Nilai paket berada di persentil ${pctile} dalam kategori ${pkg.jenisPengadaan}`,
        severity: 'SEDANG',
        score: 15,
      });
      score += 15;
    }

    // Benford's Law Flag (global)
    if (globalBenford > 20) {
      flags.push({
        type: 'STATISTICAL',
        code: 'BENFORD_DEVIATION',
        message: `Dataset menunjukkan deviasi distribusi angka ${globalBenford}% dari hukum Benford — indikasi manipulasi angka`,
        severity: globalBenford > 40 ? 'TINGGI' : 'SEDANG',
        score: Math.min(20, Math.round(globalBenford / 3)),
      });
      score += Math.min(20, Math.round(globalBenford / 3));
    }

    // Split Tender Detection
    if (detectSplitTender(pkg, packages)) {
      flags.push({
        type: 'STATISTICAL',
        code: 'SPLIT_TENDER',
        message: `Terindikasi pemecahan paket (split tender) — paket serupa dengan nilai mendekati batas Pengadaan Langsung ditemukan pada SKPD yang sama`,
        severity: 'TINGGI',
        score: 30,
      });
      score += 30;
    }

    resultMap.set(pkg.id, {
      result: {
        zScore: z,
        isOutlier: Math.abs(z) > settings.zScoreThreshold || isIQROutlier,
        percentile: pctile,
        categoryAvg: categoryMean,
        categoryMedian: categoryValues.sort((a, b) => a - b)[Math.floor(categoryValues.length / 2)] || 0,
        benfordDeviation: globalBenford,
        isSplitTender: detectSplitTender(pkg, packages),
      },
      flags,
      score: Math.min(100, score),
    });
  });

  return resultMap;
}
