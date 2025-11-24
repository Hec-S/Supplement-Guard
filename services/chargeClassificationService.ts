/**
 * Charge Classification Service
 * 
 * Implements the charge classification logic specified in Section 4 of
 * PARTS_LABOR_CHARGE_CLASSIFICATION_SPECIFICATION.md
 * 
 * This service provides deterministic classification of auto repair invoice line items
 * into charge types (parts with labor, labor-only, materials, sublet, etc.) and
 * separates combined charges into part cost and labor cost components.
 * 
 * @module chargeClassificationService
 */

import {
  InvoiceLineItem,
  ChargeClassificationResult,
  ChargeType,
  ClassificationConfidence,
  CostBreakdown,
  PartInfo,
  LaborInfo,
  MaterialInfo,
  SubletInfo,
  PartCategory
} from '../types';

// ============================================================================
// CLASSIFICATION KEYWORDS AND PATTERNS
// ============================================================================

/**
 * Keyword patterns for charge type classification.
 * Used in description analysis when operation codes are ambiguous or missing.
 */
const CLASSIFICATION_KEYWORDS = {
  PART_WITH_LABOR: {
    parts: [
      'bumper', 'fender', 'door', 'hood', 'panel', 'mirror', 'lamp',
      'headlight', 'taillight', 'grille', 'molding', 'trim', 'bracket',
      'sensor', 'camera', 'module', 'switch', 'actuator', 'motor',
      'pump', 'compressor', 'alternator', 'starter', 'battery',
      'brake pad', 'rotor', 'caliper', 'strut', 'shock', 'spring',
      'control arm', 'tie rod', 'ball joint', 'bearing', 'hub',
      'filter', 'belt', 'hose', 'gasket', 'seal'
    ],
    operations: [
      'replace', 'replacement', 'install', 'installation', 'r&r', 'r & r'
    ]
  },
  
  LABOR_ONLY: {
    services: [
      'diagnostic', 'diagnosis', 'inspection', 'test', 'testing',
      'alignment', 'balance', 'calibration', 'adjustment', 'setup',
      'programming', 'scan', 'check', 'verify', 'measure',
      'remove and install', 'r&i', 'r & i', 'disassemble', 'reassemble',
      'refinish', 'blend', 'paint', 'prep', 'sand', 'mask',
      'detail', 'clean', 'polish', 'buff'
    ]
  },
  
  MATERIAL: {
    consumables: [
      'paint', 'primer', 'clear coat', 'sealer', 'adhesive',
      'fluid', 'oil', 'coolant', 'brake fluid', 'transmission fluid',
      'supplies', 'shop supplies', 'materials', 'consumables',
      'sandpaper', 'masking', 'tape', 'thinner', 'reducer'
    ]
  },
  
  SUBLET: {
    outsourced: [
      'sublet', 'outside', 'vendor', 'third party',
      'glass shop', 'alignment shop', 'tire shop',
      'adas calibration', 'camera calibration', 'radar calibration',
      'upholstery', 'interior repair', 'dent repair', 'pdr'
    ]
  }
};

/**
 * Operation code to charge type mapping.
 * Primary classification based on standard automotive operation codes.
 */
const OPERATION_CODE_RULES: Record<string, ChargeType> = {
  // Parts with Labor - Replacement operations
  'Repl': ChargeType.PART_WITH_LABOR,
  'R&R': ChargeType.PART_WITH_LABOR,
  'Replace': ChargeType.PART_WITH_LABOR,
  'O/H': ChargeType.PART_WITH_LABOR,
  'Overhaul': ChargeType.PART_WITH_LABOR,
  
  // Labor Only - Remove and Install (same part)
  'R&I': ChargeType.LABOR_ONLY,
  'Remove and Install': ChargeType.LABOR_ONLY,
  
  // Paint/Refinish - Usually labor
  'Refn': ChargeType.LABOR_ONLY,
  'Blnd': ChargeType.LABOR_ONLY,
  'Refinish': ChargeType.LABOR_ONLY,
  'Blend': ChargeType.LABOR_ONLY,
  
  // Sublet operations
  'Subl': ChargeType.SUBLET,
  'Sublet': ChargeType.SUBLET,
};

/**
 * Typical part-to-labor cost ratios by operation type.
 * Used when explicit labor details are not available.
 */
const TYPICAL_COST_RATIOS: Record<string, { part: number; labor: number }> = {
  'Repl': { part: 0.60, labor: 0.40 },
  'R&R': { part: 0.55, labor: 0.45 },
  'O/H': { part: 0.70, labor: 0.30 },
};

/**
 * Default regional labor rates by vehicle system (in dollars per hour).
 * Used for cost estimation when labor rate is not explicitly provided.
 */
const DEFAULT_LABOR_RATES: Record<string, number> = {
  'BODY': 120,
  'PAINT': 120,
  'MECHANICAL': 150,
  'ELECTRICAL': 140,
  'FRAME': 130,
  'DEFAULT': 120
};

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classifies a line item into a charge type and extracts detailed information.
 * 
 * This is the main entry point for charge classification. It implements the
 * decision tree from Section 4.1 of the specification and returns a complete
 * classification result with charge type, confidence, and cost breakdown.
 * 
 * @param lineItem - The invoice line item to classify
 * @returns Complete classification result with charge type, confidence, and cost breakdown
 * 
 * @example
 * ```typescript
 * const result = classifyCharge({
 *   id: 'line-1',
 *   description: 'Repl Rear Bumper Cover',
 *   operation: 'Repl',
 *   partNumber: '3CN807421BGRU',
 *   laborHours: 2.5,
 *   laborRate: 120,
 *   quantity: 1,
 *   price: 750,
 *   total: 750
 * });
 * // result.chargeType === ChargeType.PART_WITH_LABOR
 * // result.confidence === 0.95
 * // result.costBreakdown.partCost === 450
 * // result.costBreakdown.laborCost === 300
 * ```
 */
export function classifyCharge(lineItem: InvoiceLineItem): ChargeClassificationResult {
  // Step 1: Determine the charge type using the decision tree
  const chargeType = determineChargeType(lineItem);
  
  // Step 2: Calculate confidence score based on classification factors
  const confidence = calculateConfidence(lineItem, chargeType);
  
  // Step 3: Separate costs for PART_WITH_LABOR charges
  const costBreakdown = separateCosts(lineItem, chargeType);
  
  // Step 4: Build the complete classification result
  const result: ChargeClassificationResult = {
    lineItemId: lineItem.id,
    chargeType,
    confidence: confidence.score,
    classificationFactors: confidence.factors,
    costBreakdown,
    warnings: []
  };
  
  // Add warnings for low confidence or validation issues
  if (confidence.score < 0.7) {
    result.warnings?.push('Low confidence classification - manual review recommended');
  }
  
  if (costBreakdown && !costBreakdown.isValidated) {
    result.warnings?.push('Cost breakdown could not be validated - estimates used');
  }
  
  return result;
}

// ============================================================================
// HELPER FUNCTIONS - CHARGE TYPE DETERMINATION
// ============================================================================

/**
 * Determines the charge type using the classification decision tree.
 * 
 * Implements the decision tree from Section 4.1 of the specification:
 * 1. Check operation codes (highest priority)
 * 2. Check part category
 * 3. Check part number presence
 * 4. Analyze description keywords
 * 5. Check labor hours as fallback
 * 
 * @param lineItem - The line item to classify
 * @returns The determined charge type
 */
function determineChargeType(lineItem: InvoiceLineItem): ChargeType {
  // Step 1: Check operation code (highest priority)
  if (lineItem.operation) {
    const opCode = lineItem.operation.trim();
    
    // Sublet operations - immediate classification
    if (/subl/i.test(opCode)) {
      return ChargeType.SUBLET;
    }
    
    // Replacement operations (Repl, R&R) - check for part number
    if (/repl|r&r|replace/i.test(opCode)) {
      // If part number exists, high confidence PART_WITH_LABOR
      if (lineItem.partNumber) {
        return ChargeType.PART_WITH_LABOR;
      }
      // If labor hours exist, inferred PART_WITH_LABOR
      if (lineItem.laborHours) {
        return ChargeType.PART_WITH_LABOR;
      }
      // Default to PART_WITH_LABOR for replacement operations
      return ChargeType.PART_WITH_LABOR;
    }
    
    // Remove and Install (R&I) - labor only
    if (/r&i|remove.*install/i.test(opCode)) {
      return ChargeType.LABOR_ONLY;
    }
    
    // Refinish/Blend operations - check if material or labor
    if (/refn|blnd|refinish|blend/i.test(opCode)) {
      if (isPaintMaterial(lineItem.description)) {
        return ChargeType.MATERIAL;
      }
      return ChargeType.LABOR_ONLY;
    }
    
    // Repair operations - context dependent, continue to next steps
  }
  
  // Step 2: Check part category
  if (lineItem.partCategory) {
    const categoryType = classifyByPartCategory(lineItem.partCategory);
    if (categoryType) {
      return categoryType;
    }
  }
  
  // Step 3: Check part number presence
  if (lineItem.partNumber && lineItem.partNumber.trim().length > 0) {
    return ChargeType.PART_WITH_LABOR;
  }
  
  // Step 4: Description keyword analysis
  const descAnalysis = analyzeDescription(lineItem.description);
  if (descAnalysis.type !== ChargeType.UNKNOWN) {
    return descAnalysis.type;
  }
  
  // Step 5: Fallback - check labor hours
  if (lineItem.laborHours && lineItem.laborHours > 0) {
    return ChargeType.LABOR_ONLY;
  }
  
  // Unable to classify
  return ChargeType.UNKNOWN;
}

/**
 * Classifies charge type based on part category field.
 * 
 * @param category - The part category string
 * @returns Charge type or null if category doesn't map to a specific type
 */
function classifyByPartCategory(category: string): ChargeType | null {
  const categoryMap: Record<string, ChargeType> = {
    'OEM': ChargeType.PART_WITH_LABOR,
    'AFTERMARKET': ChargeType.PART_WITH_LABOR,
    'LABOR': ChargeType.LABOR_ONLY,
    'PAINT_MATERIALS': ChargeType.MATERIAL,
    'CONSUMABLES': ChargeType.MATERIAL,
    'RENTAL': ChargeType.MISCELLANEOUS,
    'STORAGE': ChargeType.MISCELLANEOUS,
  };
  
  return categoryMap[category] || null;
}

/**
 * Analyzes description text for classification keywords.
 * 
 * Searches for keywords that indicate specific charge types:
 * - Part keywords (bumper, fender, etc.) → PART_WITH_LABOR
 * - Labor keywords (diagnostic, alignment, etc.) → LABOR_ONLY
 * - Material keywords (paint, supplies, etc.) → MATERIAL
 * - Sublet keywords (sublet, outside, etc.) → SUBLET
 * 
 * @param description - The line item description
 * @returns Analysis result with charge type, confidence, and matched keywords
 */
function analyzeDescription(description: string): {
  type: ChargeType;
  confidence: number;
  keywords: string[];
} {
  const desc = description.toLowerCase();
  const keywords: string[] = [];
  
  // Check for part keywords
  const partMatches = CLASSIFICATION_KEYWORDS.PART_WITH_LABOR.parts
    .filter(keyword => desc.includes(keyword));
  const partOpMatches = CLASSIFICATION_KEYWORDS.PART_WITH_LABOR.operations
    .filter(keyword => desc.includes(keyword));
  
  if (partMatches.length > 0 || partOpMatches.length > 0) {
    keywords.push(...partMatches, ...partOpMatches);
    return {
      type: ChargeType.PART_WITH_LABOR,
      confidence: 0.75,
      keywords
    };
  }
  
  // Check for labor-only keywords
  const laborMatches = CLASSIFICATION_KEYWORDS.LABOR_ONLY.services
    .filter(keyword => desc.includes(keyword));
  
  if (laborMatches.length > 0) {
    keywords.push(...laborMatches);
    return {
      type: ChargeType.LABOR_ONLY,
      confidence: 0.80,
      keywords
    };
  }
  
  // Check for material keywords
  const materialMatches = CLASSIFICATION_KEYWORDS.MATERIAL.consumables
    .filter(keyword => desc.includes(keyword));
  
  if (materialMatches.length > 0) {
    keywords.push(...materialMatches);
    return {
      type: ChargeType.MATERIAL,
      confidence: 0.85,
      keywords
    };
  }
  
  // Check for sublet keywords
  const subletMatches = CLASSIFICATION_KEYWORDS.SUBLET.outsourced
    .filter(keyword => desc.includes(keyword));
  
  if (subletMatches.length > 0) {
    keywords.push(...subletMatches);
    return {
      type: ChargeType.SUBLET,
      confidence: 0.90,
      keywords
    };
  }
  
  return {
    type: ChargeType.UNKNOWN,
    confidence: 0.0,
    keywords: []
  };
}

/**
 * Checks if description indicates paint material rather than paint labor.
 * 
 * @param description - The line item description
 * @returns True if description indicates paint material
 */
function isPaintMaterial(description: string): boolean {
  const paintMaterialKeywords = [
    'paint', 'primer', 'clear coat', 'sealer', 'base coat',
    'supplies', 'materials'
  ];
  const desc = description.toLowerCase();
  return paintMaterialKeywords.some(keyword => desc.includes(keyword));
}

// ============================================================================
// HELPER FUNCTIONS - CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculates confidence score for the classification.
 * 
 * Confidence is based on:
 * - Operation code match (high confidence)
 * - Part number presence (medium-high confidence)
 * - Labor hours presence (medium confidence)
 * - Description keyword matches (medium confidence)
 * - Part category match (medium-high confidence)
 * 
 * @param lineItem - The line item being classified
 * @param chargeType - The determined charge type
 * @returns Confidence object with score and factors
 */
function calculateConfidence(
  lineItem: InvoiceLineItem,
  chargeType: ChargeType
): ClassificationConfidence {
  const factors: ClassificationConfidence['factors'] = {};
  let score = 0.5; // Base score
  
  // Operation code match (highest confidence boost)
  if (lineItem.operation) {
    const opCode = lineItem.operation.trim();
    
    if (chargeType === ChargeType.SUBLET && /subl/i.test(opCode)) {
      factors.operationCodeMatch = true;
      score = 0.95;
    } else if (chargeType === ChargeType.PART_WITH_LABOR && /repl|r&r/i.test(opCode)) {
      factors.operationCodeMatch = true;
      score = 0.85;
    } else if (chargeType === ChargeType.LABOR_ONLY && /r&i|refn|blnd/i.test(opCode)) {
      factors.operationCodeMatch = true;
      score = 0.90;
    }
  }
  
  // Part number presence (high confidence for parts)
  if (lineItem.partNumber && lineItem.partNumber.trim().length > 0) {
    factors.hasPartNumber = true;
    if (chargeType === ChargeType.PART_WITH_LABOR) {
      score = Math.max(score, 0.80);
      // Boost if also has labor hours
      if (lineItem.laborHours) {
        score = 0.95;
      }
    }
  }
  
  // Labor hours presence
  if (lineItem.laborHours && lineItem.laborHours > 0) {
    factors.hasLaborHours = true;
    if (chargeType === ChargeType.LABOR_ONLY || chargeType === ChargeType.PART_WITH_LABOR) {
      score = Math.max(score, 0.75);
    }
  }
  
  // Part category match
  if (lineItem.partCategory) {
    const categoryType = classifyByPartCategory(lineItem.partCategory);
    if (categoryType === chargeType) {
      factors.partCategoryMatch = true;
      score = Math.max(score, 0.85);
    }
  }
  
  // Description keyword analysis
  const descAnalysis = analyzeDescription(lineItem.description);
  if (descAnalysis.type === chargeType && descAnalysis.keywords.length > 0) {
    factors.descriptionKeywords = descAnalysis.keywords;
    score = Math.max(score, descAnalysis.confidence);
  }
  
  // Ensure score is within valid range
  score = Math.max(0.0, Math.min(1.0, score));
  
  return { score, factors };
}

// ============================================================================
// HELPER FUNCTIONS - COST SEPARATION
// ============================================================================

/**
 * Separates combined charges into part cost and labor cost.
 * 
 * Implements the cost separation strategies from Section 5 of the specification:
 * - Method 1: Use explicit labor hours and rate if available
 * - Method 2: Use labor hours with inferred rate
 * - Method 3: Use typical part-to-labor ratios by operation type
 * - Method 4: Default ratio (60% parts, 40% labor)
 * 
 * @param lineItem - The line item to separate costs for
 * @param chargeType - The classified charge type
 * @returns Cost breakdown or undefined if not applicable
 */
function separateCosts(
  lineItem: InvoiceLineItem,
  chargeType: ChargeType
): CostBreakdown | undefined {
  // Handle LABOR_ONLY charges
  if (chargeType === ChargeType.LABOR_ONLY) {
    // If total is 0 but we have labor hours, calculate from hours × rate
    if (lineItem.total === 0 && lineItem.laborHours) {
      const laborRate = lineItem.laborRate || getRegionalLaborRate(lineItem.vehicleSystem);
      const calculatedLaborCost = lineItem.laborHours * laborRate;
      
      return {
        partCost: 0,
        laborCost: calculatedLaborCost,
        isValidated: false, // Not validated since total was 0
        validationVariance: undefined
      };
    }
    
    // Normal case: total represents labor cost
    return {
      partCost: 0,
      laborCost: lineItem.total,
      isValidated: true,
      validationVariance: undefined
    };
  }
  
  // Only separate costs for PART_WITH_LABOR charges
  if (chargeType !== ChargeType.PART_WITH_LABOR) {
    return undefined;
  }
  
  let partCost = 0;
  let laborCost = 0;
  let isValidated = false;
  let validationVariance: number | undefined;
  
  // Special case: If total is 0 but we have labor hours, calculate from hours × rate
  if (lineItem.total === 0 && lineItem.laborHours) {
    const laborRate = lineItem.laborRate || getRegionalLaborRate(lineItem.vehicleSystem);
    laborCost = lineItem.laborHours * laborRate;
    partCost = 0; // No part cost if total is 0
    isValidated = false; // Not validated since total was 0
    
    return { partCost, laborCost, isValidated, validationVariance };
  }
  
  // Method 1: Explicit labor hours and rate provided
  if (lineItem.laborHours && lineItem.laborRate) {
    laborCost = lineItem.laborHours * lineItem.laborRate;
    partCost = lineItem.total - laborCost;
    isValidated = validateCostBreakdown(partCost, laborCost, lineItem.total);
    
    if (!isValidated) {
      validationVariance = lineItem.total - (partCost + laborCost);
    }
    
    return { partCost, laborCost, isValidated, validationVariance };
  }
  
  // Method 2: Labor hours provided, need to determine rate
  if (lineItem.laborHours && !lineItem.laborRate) {
    const inferredRate = getRegionalLaborRate(lineItem.vehicleSystem);
    laborCost = lineItem.laborHours * inferredRate;
    partCost = lineItem.total - laborCost;
    
    // Mark as not validated since rate was inferred
    isValidated = false;
    
    return { partCost, laborCost, isValidated, validationVariance };
  }
  
  // Method 3: Use typical ratios by operation type
  if (lineItem.operation) {
    const opCode = lineItem.operation.trim();
    const ratio = TYPICAL_COST_RATIOS[opCode];
    
    if (ratio) {
      partCost = lineItem.total * ratio.part;
      laborCost = lineItem.total * ratio.labor;
      isValidated = false;
      
      return { partCost, laborCost, isValidated, validationVariance };
    }
  }
  
  // Method 4: Default ratio (60% parts, 40% labor for replacement operations)
  partCost = lineItem.total * 0.60;
  laborCost = lineItem.total * 0.40;
  isValidated = false;
  
  return { partCost, laborCost, isValidated, validationVariance };
}

/**
 * Validates that part cost + labor cost equals total cost within tolerance.
 * 
 * @param partCost - The calculated part cost
 * @param laborCost - The calculated labor cost
 * @param total - The total cost from the line item
 * @param tolerance - Maximum acceptable variance (default: $0.01)
 * @returns True if validation passes
 */
function validateCostBreakdown(
  partCost: number,
  laborCost: number,
  total: number,
  tolerance: number = 0.01
): boolean {
  const sum = partCost + laborCost;
  const variance = Math.abs(total - sum);
  return variance <= tolerance;
}

/**
 * Gets regional labor rate for a vehicle system.
 * 
 * @param vehicleSystem - The vehicle system (optional)
 * @returns Labor rate in dollars per hour
 */
function getRegionalLaborRate(vehicleSystem?: string): number {
  if (!vehicleSystem) {
    return DEFAULT_LABOR_RATES.DEFAULT;
  }
  
  return DEFAULT_LABOR_RATES[vehicleSystem] || DEFAULT_LABOR_RATES.DEFAULT;
}

// ============================================================================
// HELPER FUNCTIONS - INFORMATION EXTRACTION
// ============================================================================

/**
 * Extracts detailed part information from a line item.
 * 
 * @param lineItem - The line item to extract part info from
 * @returns Part information or undefined if not applicable
 */
export function extractPartInfo(lineItem: InvoiceLineItem): PartInfo | undefined {
  // Only extract for items with part numbers or part-related descriptions
  if (!lineItem.partNumber && !lineItem.description.match(/bumper|fender|door|hood|panel/i)) {
    return undefined;
  }
  
  // Extract part name from description (remove operation codes)
  let partName = lineItem.description
    .replace(/^(Repl|R&R|R&I|Replace|Install)\s+/i, '')
    .trim();
  
  return {
    name: partName,
    partNumber: lineItem.partNumber,
    cost: 0, // Will be set by cost separation
    quantity: lineItem.quantity,
    category: lineItem.partCategory as PartCategory | undefined
  };
}

/**
 * Extracts detailed labor information from a line item.
 * 
 * @param lineItem - The line item to extract labor info from
 * @returns Labor information or undefined if not applicable
 */
export function extractLaborInfo(lineItem: InvoiceLineItem): LaborInfo | undefined {
  // Only extract if labor hours are present or it's a labor operation
  if (!lineItem.laborHours && !lineItem.operation?.match(/r&i|refn|blnd|diagnostic/i)) {
    return undefined;
  }
  
  return {
    description: lineItem.description,
    operationCode: lineItem.operation,
    cost: 0, // Will be set by cost separation
    hours: lineItem.laborHours,
    rate: lineItem.laborRate,
    laborType: inferLaborType(lineItem)
  };
}

/**
 * Extracts material information from a line item.
 * 
 * @param lineItem - The line item to extract material info from
 * @returns Material information or undefined if not applicable
 */
export function extractMaterialInfo(lineItem: InvoiceLineItem): MaterialInfo | undefined {
  const desc = lineItem.description.toLowerCase();
  
  // Check for material keywords
  if (!desc.match(/paint|primer|supplies|materials|fluid|oil/i)) {
    return undefined;
  }
  
  // Determine material type
  let type: MaterialInfo['type'] = 'other';
  if (desc.match(/paint|primer|clear coat|sealer/i)) {
    type = 'paint';
  } else if (desc.match(/fluid|oil|coolant/i)) {
    type = 'fluids';
  } else if (desc.match(/supplies|materials/i)) {
    type = 'supplies';
  }
  
  return {
    description: lineItem.description,
    cost: lineItem.total,
    type
  };
}

/**
 * Extracts sublet information from a line item.
 * 
 * @param lineItem - The line item to extract sublet info from
 * @returns Sublet information or undefined if not applicable
 */
export function extractSubletInfo(lineItem: InvoiceLineItem): SubletInfo | undefined {
  const desc = lineItem.description.toLowerCase();
  
  // Check for sublet keywords
  if (!desc.match(/sublet|outside|vendor|third party/i)) {
    return undefined;
  }
  
  // Determine sublet type
  let type: SubletInfo['type'] = 'other';
  if (desc.match(/glass|windshield/i)) {
    type = 'glass';
  } else if (desc.match(/alignment/i)) {
    type = 'alignment';
  } else if (desc.match(/adas|calibration|camera|radar/i)) {
    type = 'adas';
  } else if (desc.match(/upholstery|interior/i)) {
    type = 'upholstery';
  }
  
  return {
    description: lineItem.description,
    cost: lineItem.total,
    type
  };
}

/**
 * Infers labor type from line item characteristics.
 * 
 * Labor types:
 * - M: Mechanical
 * - S: Structural
 * - F: Frame
 * - E: Electrical
 * - G: Glass
 * - D: Diagnostic
 * - P: Paint
 * 
 * @param lineItem - The line item to infer labor type from
 * @returns Labor type code or undefined
 */
function inferLaborType(lineItem: InvoiceLineItem): LaborInfo['laborType'] | undefined {
  const desc = lineItem.description.toLowerCase();
  
  if (desc.match(/diagnostic|scan|test/i)) return 'D';
  if (desc.match(/paint|refinish|blend/i)) return 'P';
  if (desc.match(/glass|windshield/i)) return 'G';
  if (desc.match(/frame|rail/i)) return 'F';
  if (desc.match(/body|panel|bumper|fender/i)) return 'S';
  if (desc.match(/electrical|wiring|sensor|module/i)) return 'E';
  if (desc.match(/engine|transmission|brake|suspension/i)) return 'M';
  
  return undefined;
}