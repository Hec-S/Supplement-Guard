import Fuse from 'fuse.js';
import { Decimal } from 'decimal.js';
import {
  InvoiceLineItem,
  EnhancedInvoiceLineItem,
  ComparisonAnalysis,
  ReconciliationResult,
  MatchedItemPair,
  VarianceStatistics,
  VarianceDetail,
  ItemVarianceAnalysis,
  MatchingCriteria,
  ComparisonOptions,
  ReconciliationOptions,
  CostCategory,
  VarianceType,
  SeverityLevel,
  CategoryVariance,
  VarianceDistribution,
  SuspiciousPattern,
  DataQualityMetrics,
  DataQualityIssue,
  RiskAssessment,
  RiskFactor,
  Discrepancy,
  DiscrepancyType,
  EnhancedInvoice,
  InvoiceMetadata,
  // Enhanced automotive imports
  VehicleSystem,
  PartCategory,
  AutomotiveFraudType,
  AutomotiveLineItem,
  AutomotiveFraudPattern
} from '../types';

// Configure Decimal.js for precise calculations
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class ComparisonEngine {
  private readonly defaultOptions: ComparisonOptions = {
    enableFuzzyMatching: true,
    matchingThreshold: 0.7,
    significanceThreshold: 5.0, // 5% threshold for significant variance
    enableCategoryClassification: true,
    enableDiscrepancyDetection: true,
    precision: 4
  };

  private readonly defaultReconciliationOptions: ReconciliationOptions = {
    matchingAlgorithm: 'hybrid',
    fuzzyThreshold: 0.6,
    enableManualReview: true,
    categoryWeighting: {
      [CostCategory.LABOR]: 1.0,
      [CostCategory.PARTS]: 1.0,
      [CostCategory.MATERIALS]: 0.8,
      [CostCategory.EQUIPMENT]: 0.9,
      [CostCategory.OVERHEAD]: 0.7,
      [CostCategory.OTHER]: 0.5
    }
  };

  /**
   * Performs comprehensive comparison analysis between original and supplement invoices
   */
  async analyzeComparison(
    originalInvoice: InvoiceLineItem[],
    supplementInvoice: InvoiceLineItem[],
    options: Partial<ComparisonOptions> = {}
  ): Promise<ComparisonAnalysis> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Validate input data
      if (!Array.isArray(originalInvoice)) {
        throw new Error(`Original invoice must be an array, received: ${typeof originalInvoice}`);
      }
      if (!Array.isArray(supplementInvoice)) {
        throw new Error(`Supplement invoice must be an array, received: ${typeof supplementInvoice}`);
      }
      
      // Ensure we have valid arrays with proper structure
      const validOriginal = originalInvoice.filter(item =>
        item && typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.description === 'string' &&
        typeof item.quantity === 'number' &&
        typeof item.price === 'number' &&
        typeof item.total === 'number'
      );
      
      const validSupplement = supplementInvoice.filter(item =>
        item && typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.description === 'string' &&
        typeof item.quantity === 'number' &&
        typeof item.price === 'number' &&
        typeof item.total === 'number'
      );
      
      if (validOriginal.length === 0 && validSupplement.length === 0) {
        throw new Error('No valid line items found in either invoice');
      }
      
      // Step 1: Enhance line items with metadata
      const enhancedOriginal = await this.enhanceLineItems(validOriginal, 'original');
      const enhancedSupplement = await this.enhanceLineItems(validSupplement, 'supplement');

      // Step 2: Reconcile line items
      const reconciliation = await this.reconcileLineItems(
        enhancedOriginal,
        enhancedSupplement,
        this.defaultReconciliationOptions
      );

      // Step 3: Calculate comprehensive statistics
      const statistics = this.calculateVarianceStatistics(reconciliation);

      // Step 4: Identify discrepancies
      const discrepancies = this.identifyDiscrepancies(reconciliation, statistics);

      // Step 5: Assess risk
      const riskAssessment = this.assessRisk(statistics, discrepancies);

      // Step 6: Create enhanced invoices
      const originalEnhanced: EnhancedInvoice = {
        fileName: 'original-invoice',
        lineItems: enhancedOriginal,
        subtotal: this.calculateSubtotal(enhancedOriginal),
        tax: this.calculateTax(enhancedOriginal),
        total: this.calculateTotal(enhancedOriginal),
        metadata: this.createInvoiceMetadata('original'),
        qualityScore: this.calculateQualityScore(enhancedOriginal)
      };

      const supplementEnhanced: EnhancedInvoice = {
        fileName: 'supplement-invoice',
        lineItems: enhancedSupplement,
        subtotal: this.calculateSubtotal(enhancedSupplement),
        tax: this.calculateTax(enhancedSupplement),
        total: this.calculateTotal(enhancedSupplement),
        metadata: this.createInvoiceMetadata('supplement'),
        qualityScore: this.calculateQualityScore(enhancedSupplement)
      };

      const processingTime = Date.now() - startTime;

      return {
        analysisId: this.generateAnalysisId(),
        timestamp: new Date(),
        version: '1.0.0',
        originalInvoice: originalEnhanced,
        supplementInvoice: supplementEnhanced,
        reconciliation,
        statistics,
        discrepancies,
        riskAssessment,
        processingTime
      };

    } catch (error) {
      throw new Error(`Comparison analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reconciles line items between original and supplement invoices using fuzzy matching
   */
  async reconcileLineItems(
    originalItems: EnhancedInvoiceLineItem[],
    supplementItems: EnhancedInvoiceLineItem[],
    options: ReconciliationOptions
  ): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const matchedItems: MatchedItemPair[] = [];
    const unmatchedOriginalItems: EnhancedInvoiceLineItem[] = [];
    const newSupplementItems: EnhancedInvoiceLineItem[] = [];

    // Configure Fuse.js for fuzzy string matching
    const fuseOptions = {
      keys: ['description'],
      threshold: options.fuzzyThreshold,
      includeScore: true,
      minMatchCharLength: 3
    };

    const fuse = new Fuse(originalItems, fuseOptions);

    // Track which original items have been matched
    const matchedOriginalIds = new Set<string>();

    for (const supplementItem of supplementItems) {
      let bestMatch: MatchedItemPair | null = null;
      let bestScore = 0;

      // Try exact matching first
      const exactMatch = originalItems.find(
        orig => !matchedOriginalIds.has(orig.id) && 
        orig.description.toLowerCase().trim() === supplementItem.description.toLowerCase().trim()
      );

      if (exactMatch) {
        const matchingCriteria = this.calculateMatchingCriteria(exactMatch, supplementItem, 1.0);
        const varianceAnalysis = this.calculateItemVarianceAnalysis(exactMatch, supplementItem);
        
        bestMatch = {
          original: exactMatch,
          supplement: supplementItem,
          matchingScore: 1.0,
          matchingCriteria,
          varianceAnalysis
        };
        bestScore = 1.0;
      } else if (options.matchingAlgorithm !== 'exact') {
        // Try fuzzy matching
        const fuzzyResults = fuse.search(supplementItem.description);
        
        for (const result of fuzzyResults) {
          const originalItem = result.item;
          if (matchedOriginalIds.has(originalItem.id)) continue;

          const fuzzyScore = 1 - (result.score || 1);
          if (fuzzyScore < options.fuzzyThreshold) continue;

          const matchingCriteria = this.calculateMatchingCriteria(originalItem, supplementItem, fuzzyScore);
          const overallScore = matchingCriteria.overallScore;

          if (overallScore > bestScore && overallScore >= options.fuzzyThreshold) {
            const varianceAnalysis = this.calculateItemVarianceAnalysis(originalItem, supplementItem);
            
            bestMatch = {
              original: originalItem,
              supplement: supplementItem,
              matchingScore: overallScore,
              matchingCriteria,
              varianceAnalysis
            };
            bestScore = overallScore;
          }
        }
      }

      if (bestMatch && bestScore >= options.fuzzyThreshold) {
        // Update variance type and matching info
        bestMatch.supplement.varianceType = this.determineVarianceType(bestMatch.original, bestMatch.supplement);
        bestMatch.supplement.originalId = bestMatch.original.id;
        bestMatch.supplement.matchingConfidence = bestScore;
        
        matchedItems.push(bestMatch);
        matchedOriginalIds.add(bestMatch.original.id);
      } else {
        // No match found - this is a new item
        supplementItem.varianceType = VarianceType.NEW_ITEM;
        supplementItem.isNew = true;
        newSupplementItems.push(supplementItem);
      }
    }

    // Find unmatched original items (removed items)
    for (const originalItem of originalItems) {
      if (!matchedOriginalIds.has(originalItem.id)) {
        originalItem.varianceType = VarianceType.REMOVED_ITEM;
        unmatchedOriginalItems.push(originalItem);
      }
    }

    const processingTime = Date.now() - startTime;
    const matchingAccuracy = matchedItems.length / Math.max(originalItems.length, supplementItems.length);

    return {
      matchedItems,
      unmatchedOriginalItems,
      newSupplementItems,
      matchingAccuracy,
      totalItemsProcessed: originalItems.length + supplementItems.length,
      matchingAlgorithmUsed: options.matchingAlgorithm,
      processingTime
    };
  }

  /**
   * Calculates comprehensive variance statistics
   */
  calculateVarianceStatistics(reconciliation: ReconciliationResult): VarianceStatistics {
    const allItems = [
      ...reconciliation.matchedItems.map(m => m.supplement),
      ...reconciliation.newSupplementItems
    ];

    // Calculate total variance using correct logic: Supplement Total - Original Total
    // Original total includes all original items (matched + unmatched/removed)
    const originalTotal = [
      ...reconciliation.matchedItems.map(m => m.original),
      ...reconciliation.unmatchedOriginalItems
    ].reduce((sum, item) => sum + item.total, 0);

    // Supplement total includes all supplement items (matched + new)
    const supplementTotal = [
      ...reconciliation.matchedItems.map(m => m.supplement),
      ...reconciliation.newSupplementItems
    ].reduce((sum, item) => sum + item.total, 0);

    // Total variance is simply the difference between supplement and original totals
    const totalVariance = supplementTotal - originalTotal;
    const totalVariancePercent = originalTotal > 0 ? (totalVariance / originalTotal) * 100 : 0;

    // Calculate category variances
    const categoryVariances = this.calculateCategoryVariances(allItems, reconciliation.matchedItems);

    // Calculate variance type distribution
    const varianceTypeDistribution = this.calculateVarianceTypeDistribution(allItems);

    // Calculate statistical measures
    const variances = reconciliation.matchedItems.map(m => m.varianceAnalysis.totalVariance.absolute);
    const averageVariance = variances.length > 0 ? variances.reduce((a, b) => a + b, 0) / variances.length : 0;
    const medianVariance = this.calculateMedian(variances);
    const standardDeviation = this.calculateStandardDeviation(variances, averageVariance);

    // Identify high variance items and suspicious patterns
    const highVarianceItems = allItems.filter(item => item.hasSignificantVariance);
    const suspiciousPatterns = this.identifySuspiciousPatterns(allItems, reconciliation.matchedItems);

    // Calculate data quality metrics
    const dataQuality = this.calculateDataQualityMetrics(allItems);

    return {
      totalVariance,
      totalVariancePercent,
      itemCount: allItems.length,
      categoryVariances,
      varianceTypeDistribution,
      averageVariance,
      medianVariance,
      standardDeviation,
      varianceRange: {
        min: Math.min(...variances, 0),
        max: Math.max(...variances, 0)
      },
      highVarianceItems,
      suspiciousPatterns,
      dataQuality
    };
  }

  /**
   * Enhances basic line items with comprehensive metadata
   */
  private async enhanceLineItems(
    items: InvoiceLineItem[],
    type: 'original' | 'supplement'
  ): Promise<EnhancedInvoiceLineItem[]> {
    // Additional safety check
    if (!Array.isArray(items)) {
      console.warn(`enhanceLineItems received non-array input: ${typeof items}`, items);
      return [];
    }
    
    return items.map((item, index) => {
      const automotiveClassification = this.classifyAutomotivePart(item);
      
      return {
        ...item,
        category: this.classifyItemCategory(item),
        categoryConfidence: 0.8, // Default confidence
        matchingConfidence: type === 'original' ? 1.0 : 0.0,
        varianceType: VarianceType.NO_CHANGE,
        quantityVariance: 0,
        priceVariance: 0,
        totalVariance: 0,
        quantityChangePercent: null,
        priceChangePercent: null,
        totalChangePercent: null,
        isPotentialDuplicate: false,
        hasSignificantVariance: false,
        requiresReview: false,
        lastModified: new Date(),
        modificationReason: `Enhanced from ${type} invoice`,
        // Enhanced automotive fields
        partNumber: automotiveClassification.partNumber,
        vehicleSystem: automotiveClassification.vehicleSystem,
        partCategory: automotiveClassification.partCategory,
        isOEM: automotiveClassification.isOEM,
        laborHours: automotiveClassification.laborHours,
        laborRate: automotiveClassification.laborRate
      };
    });
  }

  /**
   * Classifies an item into a cost category based on description
   */
  private classifyItemCategory(item: InvoiceLineItem): CostCategory {
    const description = item.description.toLowerCase();
    
    // Labor keywords
    if (/\b(labor|work|hour|service|technician|mechanic|install|repair)\b/.test(description)) {
      return CostCategory.LABOR;
    }
    
    // Parts keywords
    if (/\b(part|component|replacement|oem|aftermarket|filter|belt|brake|engine)\b/.test(description)) {
      return CostCategory.PARTS;
    }
    
    // Materials keywords
    if (/\b(material|paint|primer|adhesive|sealant|fluid|oil|coolant)\b/.test(description)) {
      return CostCategory.MATERIALS;
    }
    
    // Equipment keywords
    if (/\b(rental|tool|equipment|machinery|lift|diagnostic)\b/.test(description)) {
      return CostCategory.EQUIPMENT;
    }
    
    // Overhead keywords
    if (/\b(shop|overhead|admin|disposal|environmental|fee|charge)\b/.test(description)) {
      return CostCategory.OVERHEAD;
    }
    
    return CostCategory.OTHER;
  }

  /**
   * Classifies automotive parts with detailed analysis
   */
  private classifyAutomotivePart(item: InvoiceLineItem): {
    partNumber: string | null;
    vehicleSystem: VehicleSystem | null;
    partCategory: PartCategory | null;
    isOEM: boolean | null;
    laborHours: number | null;
    laborRate: number | null;
  } {
    const description = item.description.toLowerCase();
    
    // Extract part number patterns
    const partNumber = this.extractPartNumber(description);
    
    // Classify vehicle system
    const vehicleSystem = this.classifyVehicleSystem(description);
    
    // Classify part category
    const partCategory = this.classifyPartCategory(description);
    
    // Determine if OEM
    const isOEM = this.isOEMPart(description);
    
    // Extract labor information
    const laborInfo = this.extractLaborInfo(description, item.price, item.quantity);
    
    return {
      partNumber,
      vehicleSystem,
      partCategory,
      isOEM,
      laborHours: laborInfo.hours,
      laborRate: laborInfo.rate
    };
  }

  /**
   * Extracts part numbers from description
   */
  private extractPartNumber(description: string): string | null {
    // Common part number patterns
    const patterns = [
      /\b([A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,6}[-\s]?[A-Z0-9]{2,6})\b/i, // Generic: AB-123-456
      /\b(90[0-9]{3}[-\s]?[A-Z0-9]{5})\b/i, // Toyota style: 90311-38003
      /\b(06[0-9]{3}[-\s]?[A-Z0-9]{3}[-\s]?[A-Z0-9]{3})\b/i, // Honda style: 06164-P2A-000
      /\b(F[0-9][A-Z]{2}[-\s]?[0-9]{4}[-\s]?[A-Z])\b/i, // Ford style: F1TZ-6731-A
      /\b([0-9]{3,5}[-\s]?[0-9]{3,4})\b/i, // Aftermarket: 924-5208
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, '-'); // Normalize spacing
      }
    }

    return null;
  }

  /**
   * Classifies vehicle system based on description
   */
  private classifyVehicleSystem(description: string): VehicleSystem | null {
    const systemKeywords = {
      [VehicleSystem.ENGINE]: [
        'engine', 'motor', 'piston', 'valve', 'timing', 'camshaft', 'crankshaft',
        'cylinder', 'head', 'block', 'gasket', 'manifold', 'turbo', 'supercharger',
        'radiator', 'water pump', 'thermostat', 'cooling fan', 'hose',
        'coolant', 'reservoir', 'condenser', 'fuel pump', 'injector', 'fuel line',
        'tank', 'fuel filter', 'carburetor', 'throttle body'
      ],
      [VehicleSystem.TRANSMISSION]: [
        'transmission', 'trans', 'gearbox', 'clutch', 'torque converter',
        'differential', 'axle', 'driveshaft', 'cv joint'
      ],
      [VehicleSystem.BRAKES]: [
        'brake', 'pad', 'rotor', 'disc', 'caliper', 'master cylinder',
        'brake line', 'abs', 'brake fluid'
      ],
      [VehicleSystem.SUSPENSION]: [
        'shock', 'strut', 'spring', 'control arm', 'ball joint', 'sway bar',
        'stabilizer', 'bushing', 'mount', 'wheel', 'tire', 'rim', 'tpms', 'bearing', 'hub', 'lug'
      ],
      [VehicleSystem.ELECTRICAL]: [
        'alternator', 'starter', 'battery', 'wiring', 'harness', 'sensor',
        'ecu', 'pcm', 'module', 'relay', 'fuse', 'air conditioning', 'a/c', 'ac',
        'compressor', 'heater', 'blower', 'evaporator', 'hvac', 'airbag', 'seatbelt',
        'safety', 'crash', 'impact', 'restraint'
      ],
      [VehicleSystem.BODY]: [
        'panel', 'bumper', 'fender', 'door', 'hood', 'trunk', 'quarter panel',
        'mirror', 'trim', 'molding', 'seat', 'dashboard', 'carpet', 'door panel',
        'console', 'steering wheel', 'instrument'
      ],
      [VehicleSystem.EXHAUST]: [
        'exhaust', 'muffler', 'catalytic converter', 'cat', 'pipe', 'resonator',
        'tailpipe', 'header'
      ],
      [VehicleSystem.STEERING]: [
        'steering', 'rack', 'pinion', 'power steering', 'pump', 'tie rod',
        'steering column'
      ]
    };

    for (const [system, keywords] of Object.entries(systemKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return system as VehicleSystem;
      }
    }

    return null;
  }

  /**
   * Classifies part category
   */
  private classifyPartCategory(description: string): PartCategory | null {
    // Labor indicators
    if (/\b(labor|work|hour|service|install|repair|diagnostic)\b/.test(description)) {
      return PartCategory.LABOR;
    }

    // Paint and materials
    if (/\b(paint|primer|clear coat|adhesive|sealant|masking|sandpaper)\b/.test(description)) {
      return PartCategory.AFTERMARKET;
    }

    // Consumables
    if (/\b(fluid|oil|coolant|filter|gasket|bolt|nut|washer|clip)\b/.test(description)) {
      return PartCategory.AFTERMARKET;
    }

    // Rental
    if (/\b(rental|rent|loaner)\b/.test(description)) {
      return PartCategory.AFTERMARKET;
    }

    // Storage
    if (/\b(storage|tow|towing)\b/.test(description)) {
      return PartCategory.AFTERMARKET;
    }

    // OEM indicators
    if (this.isOEMPart(description)) {
      return PartCategory.OEM;
    }

    // Default to aftermarket for parts
    if (/\b(part|component|replacement)\b/.test(description)) {
      return PartCategory.AFTERMARKET;
    }

    return null;
  }

  /**
   * Determines if part is OEM
   */
  private isOEMPart(description: string): boolean | null {
    const oemIndicators = [
      'genuine', 'oem', 'original', 'factory', 'toyota', 'honda', 'ford',
      'gm', 'chevrolet', 'nissan', 'hyundai', 'kia', 'volkswagen', 'bmw',
      'mercedes', 'audi', 'lexus', 'acura', 'infiniti'
    ];

    const aftermarketIndicators = [
      'aftermarket', 'dorman', 'beck arnley', 'febi', 'lemforder', 'corteco',
      'gates', 'dayco', 'bosch', 'denso', 'ngk', 'champion'
    ];

    const lowerDesc = description.toLowerCase();

    if (oemIndicators.some(indicator => lowerDesc.includes(indicator))) {
      return true;
    }

    if (aftermarketIndicators.some(indicator => lowerDesc.includes(indicator))) {
      return false;
    }

    return null; // Cannot determine
  }

  /**
   * Extracts labor information from description and pricing
   */
  private extractLaborInfo(description: string, price: number, quantity: number): {
    hours: number | null;
    rate: number | null;
  } {
    // Look for hour patterns in description
    const hourPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i,
      /(\d+(?:\.\d+)?)\s*(?:hr|h)\b/i
    ];

    // Look for rate patterns
    const ratePatterns = [
      /\$?(\d+(?:\.\d+)?)\s*(?:\/hr|per\s*hour|hourly)/i,
      /@\s*\$?(\d+(?:\.\d+)?)/i
    ];

    let hours: number | null = null;
    let rate: number | null = null;

    // Extract hours
    for (const pattern of hourPatterns) {
      const match = description.match(pattern);
      if (match) {
        hours = parseFloat(match[1]);
        break;
      }
    }

    // Extract rate
    for (const pattern of ratePatterns) {
      const match = description.match(pattern);
      if (match) {
        rate = parseFloat(match[1]);
        break;
      }
    }

    // If we have hours but no rate, try to calculate rate
    if (hours && !rate && quantity === hours) {
      rate = price / hours;
    }

    // If we have rate but no hours, try to calculate hours
    if (rate && !hours && price > 0) {
      hours = price / rate;
    }

    return { hours, rate };
  }

  /**
   * Calculates matching criteria between two items
   */
  private calculateMatchingCriteria(
    original: EnhancedInvoiceLineItem, 
    supplement: EnhancedInvoiceLineItem, 
    fuzzyScore: number
  ): MatchingCriteria {
    const exactDescriptionMatch = original.description === supplement.description ? 1.0 : 0.0;
    const categoryMatch = original.category === supplement.category ? 1.0 : 0.0;
    
    // Price range matching (within 50% range)
    const priceDiff = Math.abs(original.price - supplement.price);
    const avgPrice = (original.price + supplement.price) / 2;
    const priceRangeMatch = avgPrice > 0 ? Math.max(0, 1 - (priceDiff / (avgPrice * 0.5))) : 1.0;
    
    // Weighted overall score
    const overallScore = (
      exactDescriptionMatch * 0.4 +
      fuzzyScore * 0.3 +
      categoryMatch * 0.2 +
      priceRangeMatch * 0.1
    );

    return {
      exactDescriptionMatch,
      fuzzyDescriptionMatch: fuzzyScore,
      categoryMatch,
      priceRangeMatch,
      overallScore
    };
  }

  /**
   * Calculates detailed variance analysis for a matched item pair
   */
  private calculateItemVarianceAnalysis(
    original: EnhancedInvoiceLineItem, 
    supplement: EnhancedInvoiceLineItem
  ): ItemVarianceAnalysis {
    const quantityVariance = this.calculateVarianceDetail(original.quantity, supplement.quantity);
    const priceVariance = this.calculateVarianceDetail(original.price, supplement.price);
    const totalVariance = this.calculateVarianceDetail(original.total, supplement.total);

    const isSignificant = Math.abs(totalVariance.percentage || 0) > this.defaultOptions.significanceThreshold;
    const riskLevel = this.determineRiskLevel(totalVariance.percentage || 0);

    // Update supplement item with properly formatted variance data
    supplement.quantityVariance = this.formatNumber(quantityVariance.absolute, 4);
    supplement.priceVariance = this.formatNumber(priceVariance.absolute, 2);
    supplement.totalVariance = this.formatNumber(totalVariance.absolute, 2);
    supplement.quantityChangePercent = quantityVariance.percentage ? this.formatNumber(quantityVariance.percentage, 2) : null;
    supplement.priceChangePercent = priceVariance.percentage ? this.formatNumber(priceVariance.percentage, 2) : null;
    supplement.totalChangePercent = totalVariance.percentage ? this.formatNumber(totalVariance.percentage, 2) : null;
    supplement.hasSignificantVariance = isSignificant;

    return {
      quantityVariance,
      priceVariance,
      totalVariance,
      isSignificant,
      riskLevel
    };
  }

  /**
   * Calculates variance detail for two values with proper precision handling
   */
  private calculateVarianceDetail(original: number, current: number): VarianceDetail {
    const originalDecimal = new Decimal(original);
    const currentDecimal = new Decimal(current);
    
    // Apply proper rounding to prevent floating-point precision errors
    const absolute = currentDecimal.minus(originalDecimal).toDecimalPlaces(4).toNumber();
    
    let percentage: number | null = null;
    if (original !== 0) {
      percentage = originalDecimal.equals(0) ? null :
        currentDecimal.minus(originalDecimal)
          .dividedBy(originalDecimal)
          .times(100)
          .toDecimalPlaces(2)  // Round percentages to 2 decimal places
          .toNumber();
    }

    const isIncrease = absolute > 0;
    const absPercentage = Math.abs(percentage || 0);
    
    let significance: 'negligible' | 'minor' | 'moderate' | 'major' | 'extreme';
    if (absPercentage < 1) significance = 'negligible';
    else if (absPercentage < 5) significance = 'minor';
    else if (absPercentage < 15) significance = 'moderate';
    else if (absPercentage < 50) significance = 'major';
    else significance = 'extreme';

    return {
      absolute,
      percentage,
      isIncrease,
      significance
    };
  }

  /**
   * Utility methods for consistent number formatting
   */
  private formatNumber(value: number, decimals: number = 4): number {
    return new Decimal(value).toDecimalPlaces(decimals).toNumber();
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.formatNumber(value, 2));
  }

  private formatPercentage(value: number | null): string {
    if (value === null) return 'N/A';
    const rounded = this.formatNumber(value, 2);
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}%`;
  }

  private formatQuantity(value: number): number {
    return this.formatNumber(value, 3); // Allow up to 3 decimal places for quantities
  }

  /**
   * Determines the variance type between original and supplement items
   */
  private determineVarianceType(original: EnhancedInvoiceLineItem, supplement: EnhancedInvoiceLineItem): VarianceType {
    if (original.description !== supplement.description) {
      return VarianceType.DESCRIPTION_CHANGE;
    }
    if (original.quantity !== supplement.quantity && original.price !== supplement.price) {
      return VarianceType.QUANTITY_CHANGE; // Prioritize quantity change
    }
    if (original.quantity !== supplement.quantity) {
      return VarianceType.QUANTITY_CHANGE;
    }
    if (original.price !== supplement.price) {
      return VarianceType.PRICE_CHANGE;
    }
    return VarianceType.NO_CHANGE;
  }

  /**
   * Determines risk level based on percentage change
   */
  private determineRiskLevel(percentageChange: number): SeverityLevel {
    const abs = Math.abs(percentageChange);
    if (abs < 5) return SeverityLevel.LOW;
    if (abs < 15) return SeverityLevel.MEDIUM;
    if (abs < 50) return SeverityLevel.HIGH;
    return SeverityLevel.CRITICAL;
  }

  // Helper methods for statistical calculations
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateCategoryVariances(
    items: EnhancedInvoiceLineItem[], 
    matchedItems: MatchedItemPair[]
  ): Record<CostCategory, CategoryVariance> {
    const categories = Object.values(CostCategory);
    const result: Record<CostCategory, CategoryVariance> = {} as any;

    for (const category of categories) {
      const categoryItems = items.filter(item => item.category === category);
      const categoryMatches = matchedItems.filter(match => match.supplement.category === category);
      
      const variance = categoryMatches.reduce((sum, match) => sum + match.varianceAnalysis.totalVariance.absolute, 0);
      const originalTotal = categoryMatches.reduce((sum, match) => sum + match.original.total, 0);
      const variancePercent = originalTotal > 0 ? (variance / originalTotal) * 100 : 0;
      const averageVariance = categoryMatches.length > 0 ? variance / categoryMatches.length : 0;
      const significantItems = categoryItems.filter(item => item.hasSignificantVariance).map(item => item.id);

      result[category] = {
        variance,
        variancePercent,
        itemCount: categoryItems.length,
        averageVariance,
        significantItems
      };
    }

    return result;
  }

  private calculateVarianceTypeDistribution(items: EnhancedInvoiceLineItem[]): Record<VarianceType, VarianceDistribution> {
    const types = Object.values(VarianceType);
    const result: Record<VarianceType, VarianceDistribution> = {} as any;
    const totalItems = items.length;

    for (const type of types) {
      const typeItems = items.filter(item => item.varianceType === type);
      const totalAmount = typeItems.reduce((sum, item) => sum + Math.abs(item.totalVariance), 0);
      const averageAmount = typeItems.length > 0 ? totalAmount / typeItems.length : 0;

      result[type] = {
        count: typeItems.length,
        totalAmount,
        percentage: totalItems > 0 ? (typeItems.length / totalItems) * 100 : 0,
        averageAmount
      };
    }

    return result;
  }

  private identifySuspiciousPatterns(
    items: EnhancedInvoiceLineItem[], 
    matchedItems: MatchedItemPair[]
  ): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    // Check for duplicate items
    const descriptions = items.map(item => item.description.toLowerCase().trim());
    const duplicates = descriptions.filter((desc, index) => descriptions.indexOf(desc) !== index);
    if (duplicates.length > 0) {
      patterns.push({
        type: 'duplicate_items',
        description: `Found ${duplicates.length} potential duplicate items`,
        confidence: 0.8,
        affectedItems: items.filter(item => duplicates.includes(item.description.toLowerCase().trim())).map(item => item.id),
        potentialImpact: duplicates.length * 100 // Rough estimate
      });
    }

    // Check for round number bias
    const roundNumbers = matchedItems.filter(match => 
      match.supplement.price % 10 === 0 && match.supplement.price !== match.original.price
    );
    if (roundNumbers.length > matchedItems.length * 0.3) {
      patterns.push({
        type: 'round_number_bias',
        description: `${roundNumbers.length} items have suspiciously round pricing`,
        confidence: 0.6,
        affectedItems: roundNumbers.map(match => match.supplement.id),
        potentialImpact: roundNumbers.reduce((sum, match) => sum + Math.abs(match.varianceAnalysis.totalVariance.absolute), 0)
      });
    }

    // Enhanced automotive fraud detection patterns
    patterns.push(...this.detectAutomotiveFraudPatterns(items, matchedItems));

    return patterns;
  }

  /**
   * Detects automotive-specific fraud patterns
   */
  private detectAutomotiveFraudPatterns(
    items: EnhancedInvoiceLineItem[],
    matchedItems: MatchedItemPair[]
  ): AutomotiveFraudPattern[] {
    const patterns: AutomotiveFraudPattern[] = [];

    // Pattern 1: OEM parts charged but aftermarket parts used
    const oemAftermarketSwitches = matchedItems.filter(match => {
      const original = match.original as any;
      const supplement = match.supplement as any;
      return original.isOEM === true && supplement.isOEM === false &&
             supplement.price > original.price;
    });

    if (oemAftermarketSwitches.length > 0) {
      patterns.push({
        type: AutomotiveFraudType.PREMIUM_PARTS_BIAS,
        description: `${oemAftermarketSwitches.length} items switched from OEM to aftermarket but charged OEM prices`,
        confidence: 0.9,
        affectedItems: oemAftermarketSwitches.map(match => match.supplement.id),
        potentialImpact: oemAftermarketSwitches.reduce((sum, match) => sum + Math.abs(match.varianceAnalysis.totalVariance.absolute), 0),
        vehicleSystemsAffected: [...new Set(oemAftermarketSwitches.map(match => (match.supplement as any).vehicleSystem).filter(Boolean))],
        partCategoriesAffected: [...new Set(oemAftermarketSwitches.map(match => (match.supplement as any).partCategory).filter(Boolean))]
      });
    }

    // Pattern 2: Excessive labor hours for simple repairs
    const excessiveLaborItems = items.filter(item => {
      const automotiveItem = item as any;
      if (automotiveItem.laborHours && automotiveItem.laborRate) {
        // Define reasonable labor hour limits for different systems
        const maxHours = this.getMaxReasonableLaborHours(automotiveItem.vehicleSystem);
        return automotiveItem.laborHours > maxHours;
      }
      return false;
    });

    if (excessiveLaborItems.length > 0) {
      patterns.push({
        type: AutomotiveFraudType.UNNECESSARY_LABOR,
        description: `${excessiveLaborItems.length} items have excessive labor hours`,
        confidence: 0.8,
        affectedItems: excessiveLaborItems.map(item => item.id),
        potentialImpact: excessiveLaborItems.reduce((sum, item) => sum + item.total, 0),
        vehicleSystemsAffected: [...new Set(excessiveLaborItems.map(item => (item as any).vehicleSystem).filter(Boolean))],
        partCategoriesAffected: [PartCategory.LABOR]
      });
    }

    // Pattern 3: Inflated part prices compared to industry standards
    const inflatedParts = matchedItems.filter(match => {
      const priceIncrease = match.varianceAnalysis.priceVariance.percentage || 0;
      return priceIncrease > 50; // More than 50% price increase
    });

    if (inflatedParts.length > 0) {
      patterns.push({
        type: AutomotiveFraudType.OVERPRICED_PARTS,
        description: `${inflatedParts.length} parts have inflated prices (>50% increase)`,
        confidence: 0.7,
        affectedItems: inflatedParts.map(match => match.supplement.id),
        potentialImpact: inflatedParts.reduce((sum, match) => sum + Math.abs(match.varianceAnalysis.totalVariance.absolute), 0),
        vehicleSystemsAffected: [...new Set(inflatedParts.map(match => (match.supplement as any).vehicleSystem).filter(Boolean))],
        partCategoriesAffected: [...new Set(inflatedParts.map(match => (match.supplement as any).partCategory).filter(Boolean))]
      });
    }

    // Pattern 4: Unnecessary repairs (parts that typically don't need replacement)
    const unnecessaryRepairs = items.filter(item => {
      const description = item.description.toLowerCase();
      // Parts that are rarely damaged in typical accidents
      const rarelyDamagedParts = [
        'transmission', 'engine block', 'differential', 'catalytic converter',
        'ecu', 'pcm', 'airbag module'
      ];
      return rarelyDamagedParts.some(part => description.includes(part));
    });

    if (unnecessaryRepairs.length > 0) {
      patterns.push({
        type: AutomotiveFraudType.SHOTGUN_REPAIR,
        description: `${unnecessaryRepairs.length} items are rarely damaged in typical accidents`,
        confidence: 0.6,
        affectedItems: unnecessaryRepairs.map(item => item.id),
        potentialImpact: unnecessaryRepairs.reduce((sum, item) => sum + item.total, 0),
        vehicleSystemsAffected: [...new Set(unnecessaryRepairs.map(item => (item as any).vehicleSystem).filter(Boolean))],
        partCategoriesAffected: [...new Set(unnecessaryRepairs.map(item => (item as any).partCategory).filter(Boolean))]
      });
    }

    return patterns;
  }

  /**
   * Gets maximum reasonable labor hours for different vehicle systems
   */
  private getMaxReasonableLaborHours(vehicleSystem: VehicleSystem | null): number {
    const maxHours = {
      [VehicleSystem.ENGINE]: 20, // Engine work can be complex
      [VehicleSystem.TRANSMISSION]: 15, // Transmission work is involved
      [VehicleSystem.BRAKES]: 4, // Brake work is usually straightforward
      [VehicleSystem.SUSPENSION]: 6, // Suspension work varies
      [VehicleSystem.ELECTRICAL]: 8, // Electrical diagnosis can take time
      [VehicleSystem.BODY]: 12, // Body work can be extensive
      [VehicleSystem.EXHAUST]: 3, // Exhaust work is usually quick
      [VehicleSystem.STEERING]: 5, // Steering repairs are moderate
    };

    return maxHours[vehicleSystem as VehicleSystem] || 8; // Default 8 hours
  }

  private calculateDataQualityMetrics(items: EnhancedInvoiceLineItem[]): DataQualityMetrics {
    const issues: DataQualityIssue[] = [];
    let completeness = 1.0;
    let consistency = 1.0;
    let accuracy = 1.0;
    let precision = 1.0;

    // Check for missing data
    const missingData = items.filter(item => !item.description || item.quantity <= 0 || item.price <= 0);
    if (missingData.length > 0) {
      completeness = 1 - (missingData.length / items.length);
      issues.push({
        type: 'missing_data',
        description: `${missingData.length} items have missing or invalid data`,
        severity: SeverityLevel.HIGH,
        affectedFields: ['description', 'quantity', 'price'],
        suggestedFix: 'Review and complete missing item information'
      });
    }

    // Check for calculation errors
    const calculationErrors = items.filter(item => {
      const expectedTotal = new Decimal(item.quantity).times(item.price).toDecimalPlaces(2).toNumber();
      return Math.abs(item.total - expectedTotal) > 0.01;
    });
    if (calculationErrors.length > 0) {
      accuracy = 1 - (calculationErrors.length / items.length);
      issues.push({
        type: 'calculation_error',
        description: `${calculationErrors.length} items have calculation errors`,
        severity: SeverityLevel.CRITICAL,
        affectedFields: ['total'],
        suggestedFix: 'Recalculate totals: quantity × price = total'
      });
    }

    return {
      completeness,
      consistency,
      accuracy,
      precision,
      issues
    };
  }

  private identifyDiscrepancies(
    reconciliation: ReconciliationResult, 
    statistics: VarianceStatistics
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Add discrepancies from data quality issues
    statistics.dataQuality.issues.forEach((issue, index) => {
      discrepancies.push({
        id: `dq-${index}`,
        type: issue.type as DiscrepancyType,
        severity: issue.severity,
        description: issue.description,
        detailedExplanation: issue.suggestedFix || 'No additional details available',
        affectedItems: issue.affectedFields,
        potentialImpact: 0,
        recommendedAction: issue.suggestedFix || 'Manual review required',
        autoResolvable: false,
        detectedAt: new Date()
      });
    });

    return discrepancies;
  }

  private assessRisk(statistics: VarianceStatistics, discrepancies: Discrepancy[]): RiskAssessment {
    let riskScore = 0;
    const riskFactors: RiskFactor[] = [];

    // Factor in total variance percentage
    const varianceRisk = Math.min(statistics.totalVariancePercent, 100);
    riskScore += varianceRisk * 0.4;
    
    if (varianceRisk > 10) {
      riskFactors.push({
        type: 'high_variance',
        description: `Total variance of ${statistics.totalVariancePercent.toFixed(2)}% exceeds normal thresholds`,
        impact: varianceRisk,
        likelihood: 0.8,
        mitigation: 'Detailed review of high-variance items recommended'
      });
    }

    // Factor in discrepancies
    const criticalDiscrepancies = discrepancies.filter(d => d.severity === SeverityLevel.CRITICAL).length;
    const discrepancyRisk = Math.min(criticalDiscrepancies * 20, 60);
    riskScore += discrepancyRisk * 0.3;

    // Factor in suspicious patterns
    const suspiciousRisk = Math.min(statistics.suspiciousPatterns.length * 15, 30);
    riskScore += suspiciousRisk * 0.3;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      overallRiskScore: Math.round(riskScore),
      riskLevel,
      riskFactors,
      recommendations: this.generateRecommendations(riskLevel, riskFactors),
      confidenceLevel: 0.85
    };
  }

  private generateRecommendations(riskLevel: string, riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate manual review required before approval');
      recommendations.push('Consider requesting additional documentation');
    } else if (riskLevel === 'high') {
      recommendations.push('Detailed review of high-variance items recommended');
      recommendations.push('Verify pricing against industry standards');
    } else if (riskLevel === 'medium') {
      recommendations.push('Standard review process with attention to flagged items');
    } else {
      recommendations.push('Standard processing acceptable');
    }

    return recommendations;
  }

  // Utility methods
  private generateAnalysisId(): string {
    return `CMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createInvoiceMetadata(type: string): InvoiceMetadata {
    return {
      processingDate: new Date(),
      dataSource: 'api',
      validationStatus: 'validated',
      validationErrors: []
    };
  }

  private calculateSubtotal(items: EnhancedInvoiceLineItem[]): number {
    return items.reduce((sum, item) => sum + item.total, 0);
  }

  private calculateTax(items: EnhancedInvoiceLineItem[]): number {
    const subtotal = this.calculateSubtotal(items);
    return subtotal * 0.08; // 8% tax rate
  }

  private calculateTotal(items: EnhancedInvoiceLineItem[]): number {
    const subtotal = this.calculateSubtotal(items);
    const tax = this.calculateTax(items);
    return subtotal + tax;
  }

  private calculateQualityScore(items: EnhancedInvoiceLineItem[]): number {
    const dataQuality = this.calculateDataQualityMetrics(items);
    return (dataQuality.completeness + dataQuality.consistency + dataQuality.accuracy + dataQuality.precision) / 4;
  }
}

// Export singleton instance
export const comparisonEngine = new ComparisonEngine();