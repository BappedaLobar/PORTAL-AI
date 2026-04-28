import type { RUPPackage, RiskLevel, RiskBreakdown, DashboardStats } from '../types';

const WEIGHTS = { statistical: 0.40, rule: 0.35, ai: 0.25 };

export function scoreLevel(score: number): RiskLevel {
  if (score >= 75) return 'KRITIS';
  if (score >= 50) return 'TINGGI';
  if (score >= 25) return 'SEDANG';
  return 'NORMAL';
}

export function computeRiskBreakdown(
  pkg: RUPPackage,
  statisticalData: { flags: import('../types').RiskFlag[]; score: number } | undefined,
  ruleData: { flags: import('../types').RiskFlag[]; score: number } | undefined,
  aiScore: number = 0
): RiskBreakdown {
  const statScore = statisticalData?.score ?? 0;
  const ruleScore = ruleData?.score ?? 0;

  const total = Math.min(
    100,
    Math.round(
      statScore * WEIGHTS.statistical +
        ruleScore * WEIGHTS.rule +
        aiScore * WEIGHTS.ai
    )
  );

  const allFlags = [
    ...(statisticalData?.flags ?? []),
    ...(ruleData?.flags ?? []),
    ...(pkg.aiAnalysis
      ? pkg.aiAnalysis.findings.map(f => ({
          type: 'AI' as const,
          code: 'AI_FINDING',
          message: f,
          severity: pkg.aiAnalysis!.riskLevel,
          score: pkg.aiAnalysis!.riskScore,
        }))
      : []),
  ];

  return {
    statisticalScore: statScore,
    ruleScore,
    aiScore,
    totalScore: total,
    level: scoreLevel(total),
    flags: allFlags,
  };
}

export function applyRiskScores(
  packages: RUPPackage[],
  statisticalMap: Map<string, { flags: import('../types').RiskFlag[]; score: number }>,
  ruleMap: Map<string, { flags: import('../types').RiskFlag[]; score: number }>
): RUPPackage[] {
  return packages.map(pkg => {
    const statData = statisticalMap.get(pkg.id);
    const ruleData = ruleMap.get(pkg.id);
    const aiScore = pkg.aiAnalysis?.riskScore ?? 0;

    const breakdown = computeRiskBreakdown(pkg, statData, ruleData, aiScore);

    return {
      ...pkg,
      riskScore: breakdown.totalScore,
      riskLevel: breakdown.level,
      riskFlags: breakdown.flags,
    };
  });
}

export function computeDashboardStats(packages: RUPPackage[]): DashboardStats {
  const criticalPkgs = packages.filter(p => p.riskLevel === 'KRITIS');
  const highPkgs = packages.filter(p => p.riskLevel === 'TINGGI');
  const mediumPkgs = packages.filter(p => p.riskLevel === 'SEDANG');
  const normalPkgs = packages.filter(p => p.riskLevel === 'NORMAL');

  const suspiciousValue = [...criticalPkgs, ...highPkgs].reduce(
    (sum, p) => sum + (p.totalNilai || 0), 0
  );

  const skpdSet = new Set(packages.map(p => p.namaSatuanKerja));

  return {
    totalPackages: packages.length,
    totalValue: packages.reduce((sum, p) => sum + (p.totalNilai || 0), 0),
    criticalCount: criticalPkgs.length,
    highCount: highPkgs.length,
    mediumCount: mediumPkgs.length,
    normalCount: normalPkgs.length,
    suspiciousValue,
    criticalValue: criticalPkgs.reduce((sum, p) => sum + (p.totalNilai || 0), 0),
    skpdCount: skpdSet.size,
    analyzedAt: new Date(),
  };
}
