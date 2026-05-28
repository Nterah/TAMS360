/**
 * TAMS360 DERU + CI Calculation Engine
 *
 * This file is the frontend source of truth for:
 * - Component CI
 * - Component urgency
 * - CI Health
 * - CI Safety
 * - CI Final
 * - Worst urgency
 *
 * Business rule currently matched to the manual TS-M2_Ruven-006 spreadsheet example:
 *
 * D = 0  => CI = 100, urgency = R
 * D = X  => CI = null, urgency = null
 * D = U  => CI = null, urgency = null
 *
 * CI Health = average of valid component CIs
 * CI Safety = urgency mapped score based on worst valid urgency
 * CI Final  = MIN(CI Health, CI Safety)
 */

export type DegreeValue = "0" | "1" | "2" | "3" | "X" | "U" | "";
export type ExtentValue = "1" | "2" | "3" | "4" | "U" | "";
export type RelevancyValue = "1" | "2" | "3" | "4" | "U" | "";
export type UrgencyValue = "0" | "1" | "2" | "3" | "4" | "R" | "U";

export interface ComponentScoreInput {
  degree?: string | null;
  extent?: string | null;
  relevancy?: string | null;
  ci?: number | null;
  urgency?: string | null;
}

export interface ComponentCalculationResult {
  ci: number | null;
  urgency: UrgencyValue | null;
}

export interface AggregateScores {
  ci_health: number | null;
  ci_safety: number | null;
  ci_final: number | null;
  worst_urgency: UrgencyValue | null;
  valid_ci_count: number;
  assessed_urgency_count: number;
}

function normaliseCode(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim().toUpperCase();
}

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;

  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateComponentCI(
  degree: string | null | undefined,
  extent: string | null | undefined,
  relevancy: string | null | undefined
): number | null {
  const D = normaliseCode(degree);
  const E = normaliseCode(extent);
  const R = normaliseCode(relevancy);

  if (!D) return null;

  /**
   * D = U means unable to inspect.
   * D = X means not applicable / not assessed.
   * Both must be excluded from CI.
   */
  if (D === "U" || D === "X") {
    return null;
  }

  /**
   * D = 0 means inspected and no defect found.
   */
  if (D === "0") {
    return 100;
  }

  if (!E || !R || E === "U" || R === "U") {
    return null;
  }

  const d = parseNumber(D);
  const e = parseNumber(E);
  const r = parseNumber(R);

  if (d === null || e === null || r === null) return null;
  if (d < 1 || d > 3) return null;
  if (e < 1 || e > 4) return null;
  if (r < 1 || r > 4) return null;

  const penalty =
    0.5 * (d / 3) +
    0.25 * ((e - 1) / 3) +
    0.25 * ((r - 1) / 3);

  const ci = Math.round(100 * (1 - penalty));

  return Math.max(0, Math.min(100, ci));
}

export function calculateUrgency(
  degree: string | null | undefined,
  extent: string | null | undefined,
  relevancy: string | null | undefined
): UrgencyValue | null {
  const D = normaliseCode(degree);
  const E = normaliseCode(extent);
  const R = normaliseCode(relevancy);

  if (!D) return null;

  /**
   * U and X are not assessed; do not invent urgency.
   */
  if (D === "U" || D === "X") {
    return null;
  }

  /**
   * D = 0 is assessed and defect-free.
   */
  if (D === "0") {
    return "R";
  }

  if (!E || !R || E === "U" || R === "U") {
    return null;
  }

  const d = parseNumber(D);
  const e = parseNumber(E);
  const r = parseNumber(R);

  if (d === null || e === null || r === null) return null;
  if (d < 1 || d > 3) return null;
  if (e < 1 || e > 4) return null;
  if (r < 1 || r > 4) return null;

  if (r === 4) return "4";
  if (d === 3 && e === 4 && r >= 3) return "4";

  if (d === 3 && e >= 3 && r === 3) return "3";
  if (d >= 2 && d <= 3 && e === 4 && r >= 3) return "3";
  if (d === 1 && e === 4 && r === 2) return "3";

  if (d === 2 && e === 3 && r === 3) return "2";
  if (d === 3 && e <= 3 && r <= 3) return "2";
  if (d === 1 && e === 3 && r === 2) return "2";
  if (d === 1 && e === 2 && r === 3) return "2";
  if (d === 2 && e <= 3 && r === 3) return "2";

  if (d === 2 && e <= 3 && r <= 2) return "1";
  if (d === 1 && e === 3 && r === 3) return "1";
  if (d === 1 && e === 1 && r === 3) return "1";

  return "0";
}

export function calculateComponentDERU(
  degree: string | null | undefined,
  extent: string | null | undefined,
  relevancy: string | null | undefined
): ComponentCalculationResult {
  return {
    ci: calculateComponentCI(degree, extent, relevancy),
    urgency: calculateUrgency(degree, extent, relevancy),
  };
}

export function urgencyToCISafety(urgency: UrgencyValue | null | undefined): number | null {
  if (!urgency) return null;

  const map: Record<UrgencyValue, number | null> = {
    R: 100,
    "0": 90,
    "1": 75,
    "2": 50,
    "3": 25,
    "4": 0,
    U: null,
  };

  return map[urgency] ?? null;
}

export function getWorstUrgency(scores: ComponentScoreInput[]): UrgencyValue | null {
  const urgencies = scores
    .map((score) => normaliseCode(score.urgency))
    .filter((urgency): urgency is UrgencyValue =>
      ["0", "1", "2", "3", "4", "R"].includes(urgency)
    );

  if (urgencies.length === 0) return null;

  if (urgencies.includes("4")) return "4";
  if (urgencies.includes("3")) return "3";
  if (urgencies.includes("2")) return "2";
  if (urgencies.includes("1")) return "1";
  if (urgencies.includes("0")) return "0";

  return "R";
}

export function calculateAggregateScores(scores: ComponentScoreInput[]): AggregateScores {
  const validCIs = scores
    .map((score) => {
      if (typeof score.ci === "number" && Number.isFinite(score.ci)) {
        return Math.max(0, Math.min(100, Math.round(score.ci)));
      }

      return calculateComponentCI(score.degree, score.extent, score.relevancy);
    })
    .filter((ci): ci is number => ci !== null);

  const ci_health =
    validCIs.length > 0
      ? Math.round(validCIs.reduce((sum, ci) => sum + ci, 0) / validCIs.length)
      : null;

  const calculatedScores = scores.map((score) => ({
    ...score,
    urgency: score.urgency ?? calculateUrgency(score.degree, score.extent, score.relevancy),
  }));

  const worst_urgency = getWorstUrgency(calculatedScores);

  const ci_safety = urgencyToCISafety(worst_urgency);

  const ci_final =
    ci_health !== null && ci_safety !== null
      ? Math.min(ci_health, ci_safety)
      : ci_health ?? ci_safety ?? null;

  const assessed_urgency_count = calculatedScores.filter((score) => {
    const urgency = normaliseCode(score.urgency);
    return ["0", "1", "2", "3", "4", "R"].includes(urgency);
  }).length;

  return {
    ci_health,
    ci_safety,
    ci_final,
    worst_urgency,
    valid_ci_count: validCIs.length,
    assessed_urgency_count,
  };
}

export function getCILabel(ci: number | null | undefined): string {
  if (ci === null || ci === undefined) return "Not Scored";
  if (ci >= 80) return "Excellent";
  if (ci >= 60) return "Good";
  if (ci >= 40) return "Fair";
  return "Poor";
}

export function getCIColorClass(ci: number | null | undefined): string {
  if (ci === null || ci === undefined) return "bg-slate-500 text-white";
  if (ci >= 80) return "bg-green-600 text-white";
  if (ci >= 60) return "bg-blue-500 text-white";
  if (ci >= 40) return "bg-yellow-400 text-black";
  return "bg-destructive text-white";
}

export function getUrgencyLabel(urgency: string | null | undefined): string {
  const U = normaliseCode(urgency);

  const labels: Record<string, string> = {
    "4": "Immediate",
    "3": "High",
    "2": "Medium",
    "1": "Low",
    "0": "Monitor",
    R: "Record Only",
    U: "Unable to Inspect",
  };

  return labels[U] ?? "Not Assessed";
}

export function getUrgencyColorClass(urgency: string | null | undefined): string {
  const U = normaliseCode(urgency);

  const classes: Record<string, string> = {
    "4": "bg-destructive text-white",
    "3": "bg-orange-500 text-white",
    "2": "bg-yellow-400 text-black",
    "1": "bg-blue-500 text-white",
    "0": "bg-green-600 text-white",
    R: "bg-slate-300 text-slate-900",
    U: "bg-slate-500 text-white",
  };

  return classes[U] ?? "bg-slate-100 text-slate-700 border border-slate-300";
}

export function formatCI(ci: number | null | undefined): string {
  return ci === null || ci === undefined ? "—" : String(ci);
}

export function formatUrgency(urgency: string | null | undefined): string {
  const U = normaliseCode(urgency);
  if (!U) return "—";
  return U;
}