/**
 * Hidden Image Service
 * 
 * Provides backend processing capabilities for hidden images,
 * including data analysis, metadata extraction, and system operations
 * while maintaining complete visual concealment from users.
 */

import { 
  findAllHiddenImages, 
  getHiddenImageData, 
  getImageAnalysisData, 
  imageToBase64,
  HiddenImageData,
  ImageAnalysisResult 
} from '../utils/hiddenImageUtils';

export interface FraudDetectionMetrics {
  fraudScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  variance: number;
  variancePercentage: number;
  matchPercentage: number;
  issuesCount: number;
  anomaliesCount: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
  processingTime: number;
}

export interface HiddenImageProcessingOptions {
  includeImageData?: boolean;
  includeMetadata?: boolean;
  includeAnalysis?: boolean;
  format?: 'base64' | 'blob' | 'imageData';
}

class HiddenImageService {
  private processingQueue: Map<string, Promise<ProcessingResult>> = new Map();
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Process fraud detection metrics from hidden image
   */
  async processFraudDetectionImage(
    imageElement: HTMLImageElement,
    options: HiddenImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const hiddenImageData = getHiddenImageData(imageElement);
      if (!hiddenImageData) {
        return {
          success: false,
          error: 'Invalid hidden image element',
          timestamp: Date.now(),
          processingTime: Date.now() - startTime,
        };
      }

      // Extract fraud detection metrics from metadata
      const metadata = hiddenImageData.metadata || {};
      const fraudMetrics: FraudDetectionMetrics = {
        fraudScore: parseInt(metadata.fraudScore || '0'),
        riskLevel: metadata.riskLevel || 'LOW',
        variance: parseFloat(metadata.variance || '0'),
        variancePercentage: parseFloat(metadata.variancePercentage || '0'),
        matchPercentage: parseFloat(metadata.matchPercentage || '0'),
        issuesCount: parseInt(metadata.issuesCount || '0'),
        anomaliesCount: parseInt(metadata.anomaliesCount || '0'),
      };

      const result: any = {
        fraudMetrics,
        imageInfo: {
          src: imageElement.src,
          alt: imageElement.alt,
          dimensions: hiddenImageData.dimensions,
          isLoaded: hiddenImageData.isLoaded,
        },
      };

      if (options.includeMetadata) {
        result.metadata = metadata;
      }

      if (options.includeImageData && hiddenImageData.isLoaded) {
        switch (options.format) {
          case 'base64':
            result.imageData = await imageToBase64(imageElement);
            break;
          case 'blob':
            result.imageData = await this.imageToBlob(imageElement);
            break;
          case 'imageData':
            result.imageData = await this.getImagePixelData(imageElement);
            break;
        }
      }

      if (options.includeAnalysis) {
        result.analysis = await getImageAnalysisData(imageElement);
      }

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch process all hidden images for fraud detection
   */
  async batchProcessFraudDetection(
    options: HiddenImageProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const hiddenImages = findAllHiddenImages();
    const results: ProcessingResult[] = [];

    for (const imageElement of hiddenImages) {
      const result = await this.processFraudDetectionImage(imageElement, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract sensitive data from hidden images for backend analysis
   */
  async extractSensitiveData(
    filter?: (data: HiddenImageData) => boolean
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const hiddenImages = findAllHiddenImages();
      const sensitiveData: any[] = [];

      for (const imageElement of hiddenImages) {
        const hiddenImageData = getHiddenImageData(imageElement);
        if (!hiddenImageData) continue;

        if (filter && !filter(hiddenImageData)) continue;

        const metadata = hiddenImageData.metadata || {};
        
        // Extract sensitive information
        const sensitiveInfo = {
          id: imageElement.id || `hidden-${Date.now()}-${Math.random()}`,
          fraudScore: metadata.fraudScore,
          riskLevel: metadata.riskLevel,
          variance: metadata.variance,
          financialImpact: metadata.variance ? parseFloat(metadata.variance) : 0,
          anomalies: metadata.anomaliesCount ? parseInt(metadata.anomaliesCount) : 0,
          issues: metadata.issuesCount ? parseInt(metadata.issuesCount) : 0,
          timestamp: metadata.timestamp || Date.now(),
          source: imageElement.src,
          dimensions: hiddenImageData.dimensions,
        };

        sensitiveData.push(sensitiveInfo);
      }

      return {
        success: true,
        data: {
          totalImages: hiddenImages.length,
          processedImages: sensitiveData.length,
          sensitiveData,
          summary: this.generateDataSummary(sensitiveData),
        },
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Monitor hidden images for real-time processing
   */
  startMonitoring(
    callback: (data: any) => void,
    options: { interval?: number; autoProcess?: boolean } = {}
  ): () => void {
    const { interval = 5000, autoProcess = true } = options;
    
    const monitorInterval = setInterval(async () => {
      if (autoProcess) {
        const results = await this.batchProcessFraudDetection({
          includeMetadata: true,
          includeAnalysis: false,
        });
        
        const processedData = results
          .filter(result => result.success)
          .map(result => result.data);
        
        if (processedData.length > 0) {
          callback({
            timestamp: Date.now(),
            processedImages: processedData.length,
            data: processedData,
          });
        }
      }
    }, interval);

    return () => clearInterval(monitorInterval);
  }

  /**
   * Cache management for processed data
   */
  private getCacheKey(imageElement: HTMLImageElement): string {
    return `${imageElement.src}-${imageElement.getAttribute('data-timestamp') || Date.now()}`;
  }

  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Convert image to blob for backend processing
   */
  private async imageToBlob(imageElement: HTMLImageElement): Promise<Blob | null> {
    if (!imageElement.complete || imageElement.naturalHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      
      ctx.drawImage(imageElement, 0, 0);
      
      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
    } catch (error) {
      console.error('Error converting image to blob:', error);
      return null;
    }
  }

  /**
   * Get pixel data for advanced analysis
   */
  private async getImagePixelData(imageElement: HTMLImageElement): Promise<ImageData | null> {
    if (!imageElement.complete || imageElement.naturalHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      
      ctx.drawImage(imageElement, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Error getting image pixel data:', error);
      return null;
    }
  }

  /**
   * Generate summary statistics from sensitive data
   */
  private generateDataSummary(sensitiveData: any[]): any {
    if (sensitiveData.length === 0) {
      return {
        totalFraudScore: 0,
        averageFraudScore: 0,
        highRiskCount: 0,
        totalVariance: 0,
        totalAnomalies: 0,
        totalIssues: 0,
      };
    }

    const totalFraudScore = sensitiveData.reduce((sum, item) => 
      sum + (parseFloat(item.fraudScore) || 0), 0);
    
    const totalVariance = sensitiveData.reduce((sum, item) => 
      sum + (item.financialImpact || 0), 0);
    
    const totalAnomalies = sensitiveData.reduce((sum, item) => 
      sum + (item.anomalies || 0), 0);
    
    const totalIssues = sensitiveData.reduce((sum, item) => 
      sum + (item.issues || 0), 0);
    
    const highRiskCount = sensitiveData.filter(item => 
      item.riskLevel === 'HIGH' || item.riskLevel === 'CRITICAL').length;

    return {
      totalFraudScore,
      averageFraudScore: totalFraudScore / sensitiveData.length,
      highRiskCount,
      totalVariance,
      totalAnomalies,
      totalIssues,
      riskDistribution: this.calculateRiskDistribution(sensitiveData),
    };
  }

  /**
   * Calculate risk level distribution
   */
  private calculateRiskDistribution(sensitiveData: any[]): Record<string, number> {
    const distribution: Record<string, number> = {
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    sensitiveData.forEach(item => {
      const riskLevel = item.riskLevel || 'LOW';
      distribution[riskLevel] = (distribution[riskLevel] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Export processed data for external systems
   */
  async exportProcessedData(
    format: 'json' | 'csv' | 'xml' = 'json',
    options: HiddenImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const extractResult = await this.extractSensitiveData();
      if (!extractResult.success) {
        return extractResult;
      }

      const data = extractResult.data;
      let exportData: string;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(data, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(data.sensitiveData);
          break;
        case 'xml':
          exportData = this.convertToXML(data);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        data: {
          format,
          content: exportData,
          size: exportData.length,
          summary: data.summary,
        },
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<hiddenImageData>'];
    
    xmlParts.push(`<summary>`);
    Object.entries(data.summary).forEach(([key, value]) => {
      xmlParts.push(`  <${key}>${value}</${key}>`);
    });
    xmlParts.push(`</summary>`);
    
    xmlParts.push(`<images>`);
    data.sensitiveData.forEach((item: any) => {
      xmlParts.push(`  <image>`);
      Object.entries(item).forEach(([key, value]) => {
        xmlParts.push(`    <${key}>${value}</${key}>`);
      });
      xmlParts.push(`  </image>`);
    });
    xmlParts.push(`</images>`);
    
    xmlParts.push('</hiddenImageData>');
    return xmlParts.join('\n');
  }

  /**
   * Clear cache and cleanup resources
   */
  cleanup(): void {
    this.cache.clear();
    this.processingQueue.clear();
  }
}

// Export singleton instance
export const hiddenImageService = new HiddenImageService();
export default hiddenImageService;