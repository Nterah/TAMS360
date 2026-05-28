/**
 * TAMS360 - Calculation Engine for CI/DERU/Urgency/Remedial Costing
 * 
 * This module contains all business logic for:
 * - Conditional Index (CI) calculation
 * - DERU calculation
 * - Urgency determination
 * - Remedial cost estimation per component
 * - Asset depreciation/valuation
 */

export interface ComponentScore {
  componentName: string;
  degreeValue: string; // "1", "2", "3", "4", "X", "U"
  extentValue: string;
  relevancyValue: string;
  quantity?: number;
  quantityUnit?: string;
}

export interface ComponentScoreCalculated extends ComponentScore {
  componentScore: number; // D × E × R
  rate: number; // Cost rate based on CI band
  componentCost: number; // quantity × rate
}

export interface CICalculation {
  conditionalIndex: number; // 0-100
  ciBand: string; // "Excellent", "Good", "Fair", "Poor"
  deruValue: number;
  calculatedUrgency: string; // "4" = Immediate, "3" = High, "2" = Medium, "1" = Low, "0" = Minor
  totalRemedialCost: number;
  componentBreakdown: ComponentScoreCalculated[];
  metadata: {
    totalComponents: number;
    scoredComponents: number;
    excludedComponents: number; // X or U
    calculationDate: string;
  };
}

/**
 * Calculate component score: D × E × R
 * Handles special cases X (not present) and U (unable to inspect)
 */
export function calculateComponentScore(
  degree: string,
  extent: string,
  relevancy: string
): number | null {
  // Special cases
  if (degree === 'X' || degree === 'U') {
    return null; // Exclude from CI calculation
  }

  const d = parseFloat(degree);
  const e = parseFloat(extent);
  const r = parseFloat(relevancy);

  if (isNaN(d) || isNaN(e) || isNaN(r)) {
    return null;
  }

  return d * e * r;
}

/**
 * Calculate weighted average considering relevancy as weight
 */
function getRelevancyWeight(relevancy: string): number {
  switch (relevancy) {
    case '4': return 2.0; // Critical
    case '3': return 1.5; // High
    case '2': return 1.0; // Medium
    case '1': return 0.5; // Low
    default: return 1.0;
  }
}

/**
 * Calculate Conditional Index (CI) from component scores
 * 
 * Formula:
 * CI = (Weighted Sum of D×E×R) / (Max Possible Score) × 100
 * 
 * Where max possible = Number of components × 64 (4×4×4)
 * 
 * @param componentScores Array of component scores
 * @returns CI value (0-100) where higher = better condition
 */
export function calculateConditionalIndex(
  componentScores: ComponentScore[]
): number | null {
  const validScores = componentScores
    .map(cs => ({
      score: calculateComponentScore(cs.degreeValue, cs.extentValue, cs.relevancyValue),
      weight: getRelevancyWeight(cs.relevancyValue)
    }))
    .filter(s => s.score !== null);

  if (validScores.length === 0) {
    return null;
  }

  // Weighted sum
  const weightedSum = validScores.reduce((sum, s) => sum + (s.score! * s.weight), 0);
  
  // Max possible score (64 per component, weighted)
  const maxPossibleWeighted = validScores.reduce((sum, s) => sum + (64 * s.weight), 0);

  // CI as percentage (higher = better)
  // Note: We invert if client wants "higher score = worse condition"
  const ci = (weightedSum / maxPossibleWeighted) * 100;

  // Invert: 100 - ci if lower component scores should mean better condition
  // For now, assuming higher CI = better (adjust based on client feedback)
  const invertedCI = 100 - ci; // Lower D/E/R = better = higher CI

  return Math.round(invertedCI * 100) / 100; // Round to 2 decimals
}

/**
 * Determine CI Band from CI value
 */
export function getCIBand(ci: number | null): string | null {
  if (ci === null) return null;
  
  if (ci >= 80) return 'Excellent';
  if (ci >= 60) return 'Good';
  if (ci >= 40) return 'Fair';
  return 'Poor';
}

/**
 * Calculate DERU (Deterioration/Urgency value)
 * 
 * Formula (example - adjust based on client specification):
 * DERU = (100 - CI) × urgency_multiplier
 * 
 * Higher DERU = more urgent need for intervention
 */
export function calculateDERU(ci: number | null): number | null {
  if (ci === null) return null;

  // DERU increases as CI decreases
  // Urgency multiplier based on condition severity
  const urgencyMultiplier = ci < 40 ? 2.0 : ci < 60 ? 1.5 : ci < 80 ? 1.0 : 0.5;
  
  const deru = (100 - ci) * urgencyMultiplier;

  return Math.round(deru * 100) / 100;
}

/**
 * Calculate urgency level from CI
 * Returns numeric urgency codes matching the D/E/R decision tree format
 * "4" = Immediate, "3" = High, "2" = Medium, "1" = Low, "0" = Minor
 */
export function calculateUrgencyFromCI(ci: number | null): string | null {
  if (ci === null) return null;

  // Map CI ranges to urgency codes (matching component-level urgency format)
  if (ci < 40) return '4'; // Poor condition → Immediate
  if (ci < 60) return '3'; // Fair condition → High  
  if (ci < 80) return '2'; // Good condition → Medium
  return '1'; // Excellent condition → Low
}

/**
 * Get remedial cost rate based on CI band and asset type
 * 
 * This would ideally come from a costing table in the database.
 * For now, using baseline rates that adjust by CI band.
 */
export function getRemedialRate(
  ciBand: string,
  assetType: string,
  componentName: string,
  quantityUnit: string
): number {
  // Base rates per unit (example - should come from database)
  const baseRates: Record<string, Record<string, number>> = {
    'Signage': {
      'each': 50,
      'm²': 100,
      'm': 30
    },
    'Guardrail': {
      'each': 200,
      'm': 150,
      'm²': 250
    },
    'Traffic Signal': {
      'each': 500,
      'm': 300,
      'm²': 400
    }
    // Add more as needed
  };

  // CI band multipliers
  const bandMultipliers: Record<string, number> = {
    'Poor': 2.0, // Requires extensive work
    'Fair': 1.5, // Moderate repairs
    'Good': 1.0, // Minor repairs
    'Excellent': 0.5 // Minimal intervention
  };

  const baseRate = baseRates[assetType]?.[quantityUnit] || 100; // Default R100/unit
  const multiplier = bandMultipliers[ciBand] || 1.0;

  return baseRate * multiplier;
}

/**
 * Calculate remedial cost for a component
 */
export function calculateComponentRemedialCost(
  component: ComponentScore,
  ciBand: string,
  assetType: string
): { rate: number; cost: number } {
  const quantity = component.quantity || 1;
  const unit = component.quantityUnit || 'each';
  
  const rate = getRemedialRate(ciBand, assetType, component.componentName, unit);
  const cost = quantity * rate;

  return { rate, cost };
}

/**
 * Full CI calculation with all components
 */
export function performFullCICalculation(
  componentScores: ComponentScore[],
  assetType: string
): CICalculation {
  // Calculate CI
  const ci = calculateConditionalIndex(componentScores);
  const ciBand = getCIBand(ci);
  const deru = calculateDERU(ci);
  const urgency = calculateUrgencyFromCI(ci);

  // Calculate remedial costs per component
  const componentBreakdown: ComponentScoreCalculated[] = componentScores.map(cs => {
    const componentScore = calculateComponentScore(cs.degreeValue, cs.extentValue, cs.relevancyValue);
    const { rate, cost } = calculateComponentRemedialCost(cs, ciBand || 'Fair', assetType);

    return {
      ...cs,
      componentScore: componentScore || 0,
      rate,
      componentCost: cost
    };
  });

  // Total remedial cost
  const totalRemedialCost = componentBreakdown.reduce((sum, c) => sum + c.componentCost, 0);

  // Count components
  const totalComponents = componentScores.length;
  const excludedComponents = componentScores.filter(
    cs => cs.degreeValue === 'X' || cs.degreeValue === 'U'
  ).length;
  const scoredComponents = totalComponents - excludedComponents;

  return {
    conditionalIndex: ci || 0,
    ciBand: ciBand || 'Unknown',
    deruValue: deru || 0,
    calculatedUrgency: urgency || '2', // Default to "2" (Medium) if urgency cannot be calculated
    totalRemedialCost: Math.round(totalRemedialCost * 100) / 100,
    componentBreakdown,
    metadata: {
      totalComponents,
      scoredComponents,
      excludedComponents,
      calculationDate: new Date().toISOString()
    }
  };
}

/**
 * Calculate asset depreciation
 * 
 * Uses straight-line depreciation: (Purchase Price - Salvage Value) / Useful Life
 */
export function calculateAssetDepreciation(
  purchasePrice: number,
  purchaseDate: Date,
  usefulLifeYears: number,
  salvageValue: number = 0
): {
  currentValue: number;
  accumulatedDepreciation: number;
  annualDepreciation: number;
  remainingLife: number;
} {
  const now = new Date();
  const ageInYears = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
  const accumulatedDepreciation = Math.min(
    annualDepreciation * ageInYears,
    purchasePrice - salvageValue
  );
  const currentValue = Math.max(purchasePrice - accumulatedDepreciation, salvageValue);
  const remainingLife = Math.max(usefulLifeYears - ageInYears, 0);

  return {
    currentValue: Math.round(currentValue * 100) / 100,
    accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    remainingLife: Math.round(remainingLife * 10) / 10
  };
}

/**
 * Calculate replacement priority score
 * 
 * Combines CI, age, and cost to prioritize replacements
 */
export function calculateReplacementPriority(
  ci: number,
  ageYears: number,
  usefulLifeYears: number,
  maintenanceCostLast12Months: number,
  replacementCost: number
): {
  priorityScore: number; // 0-100, higher = more urgent
  priorityCategory: string;
  reason: string;
} {
  // Factor 1: Condition (40% weight)
  const conditionScore = (100 - ci) * 0.4;

  // Factor 2: Age vs useful life (30% weight)
  const ageRatio = ageYears / usefulLifeYears;
  const ageScore = Math.min(ageRatio, 1.0) * 100 * 0.3;

  // Factor 3: Maintenance cost ratio (30% weight)
  const costRatio = maintenanceCostLast12Months / replacementCost;
  const costScore = Math.min(costRatio * 100, 100) * 0.3;

  const priorityScore = Math.round(conditionScore + ageScore + costScore);

  let priorityCategory = 'Low';
  let reason = '';

  if (priorityScore >= 80) {
    priorityCategory = 'Critical';
    reason = 'Poor condition, near end of life, high maintenance costs';
  } else if (priorityScore >= 60) {
    priorityCategory = 'High';
    reason = 'Deteriorating condition or high maintenance costs';
  } else if (priorityScore >= 40) {
    priorityCategory = 'Medium';
    reason = 'Aging asset requiring monitoring';
  } else {
    priorityCategory = 'Low';
    reason = 'Good condition, within expected lifecycle';
  }

  return {
    priorityScore,
    priorityCategory,
    reason
  };
}