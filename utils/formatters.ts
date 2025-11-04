import { Decimal } from 'decimal.js';

/**
 * Centralized formatting utilities for consistent number display across the application
 * Handles floating-point precision errors and provides clean, consistent formatting
 */

// Configure Decimal.js for formatting operations
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Safely formats a number with specified decimal places, handling precision errors
 */
export const formatNumber = (value: number, decimals: number = 4): number => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return new Decimal(value).toDecimalPlaces(decimals).toNumber();
};

/**
 * Formats currency values with proper precision and consistent display
 */
export const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  
  const cleanAmount = formatNumber(amount, 2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cleanAmount);
};

/**
 * Formats percentage values with proper precision and sign display
 */
export const formatPercentage = (value: number | null, decimals: number = 2): string => {
  if (value === null || typeof value !== 'number' || isNaN(value)) return 'N/A';
  
  const cleanValue = formatNumber(value, decimals);
  const sign = cleanValue > 0 ? '+' : '';
  return `${sign}${cleanValue.toFixed(decimals)}%`;
};

/**
 * Formats quantity values with appropriate precision for display
 */
export const formatQuantity = (value: number, decimals: number = 3): number => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return formatNumber(value, decimals);
};

/**
 * Formats variance values for display with proper sign and precision
 */
export const formatVariance = (value: number, isCurrency: boolean = true): string => {
  if (typeof value !== 'number' || isNaN(value)) return isCurrency ? '$0.00' : '0';
  
  const cleanValue = formatNumber(value, isCurrency ? 2 : 4);
  
  if (isCurrency) {
    const sign = cleanValue > 0 ? '+' : '';
    return `${sign}${formatCurrency(cleanValue)}`;
  } else {
    return cleanValue.toString();
  }
};

/**
 * Formats decimal values for display, removing unnecessary trailing zeros
 */
export const formatDecimal = (value: number, maxDecimals: number = 4): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  
  const cleanValue = formatNumber(value, maxDecimals);
  
  // Remove trailing zeros and unnecessary decimal point
  return cleanValue.toFixed(maxDecimals).replace(/\.?0+$/, '');
};

/**
 * Safely handles variance display with proper formatting and null checks
 */
export const formatVarianceDisplay = (
  value: number | null | undefined,
  type: 'currency' | 'percentage' | 'number' = 'currency'
): string => {
  if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
    return type === 'currency' ? '$0.00' : type === 'percentage' ? '0.00%' : '0';
  }

  switch (type) {
    case 'currency':
      return formatVariance(value, true);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
      return formatDecimal(value);
    default:
      return formatDecimal(value);
  }
};

/**
 * Enhanced currency formatter with variance indication
 */
export const formatCurrencyWithVariance = (
  originalValue: number,
  currentValue: number
): { 
  original: string;
  current: string;
  variance: string;
  isIncrease: boolean;
} => {
  const cleanOriginal = formatNumber(originalValue, 2);
  const cleanCurrent = formatNumber(currentValue, 2);
  const variance = cleanCurrent - cleanOriginal;
  
  return {
    original: formatCurrency(cleanOriginal),
    current: formatCurrency(cleanCurrent),
    variance: formatVariance(variance, true),
    isIncrease: variance > 0
  };
};

/**
 * Utility to check if a number has significant precision errors
 */
export const hasPrecisionError = (value: number, threshold: number = 1e-10): boolean => {
  if (typeof value !== 'number' || isNaN(value)) return false;
  
  const rounded = Math.round(value);
  return Math.abs(value - rounded) > threshold && Math.abs(value - rounded) < 0.5;
};

/**
 * Clean up floating-point precision errors in calculations
 */
export const cleanPrecisionError = (value: number): number => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  
  // If the value is very close to a whole number, round it
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-10) {
    return rounded;
  }
  
  // Otherwise, use Decimal.js for clean precision
  return formatNumber(value, 10);
};