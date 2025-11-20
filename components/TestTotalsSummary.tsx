import React from 'react';
import { generateImprovedPdfReport } from '../services/improvedPdfService';
import { ClaimData } from '../types';

/**
 * Test component to verify TOTALS SUMMARY table rendering in PDF
 * This creates mock data with totalsSummary to test the PDF generation
 */
export const TestTotalsSummary: React.FC = () => {
  const generateTestPdf = () => {
    // Mock claim data with TOTALS SUMMARY
    const mockClaimData: ClaimData = {
      id: 'TEST-TOTALS-001',
      claimNumber: '123456',
      vehicleInfo: {
        year: '2022',
        make: 'Toyota',
        model: 'Camry',
        vin: '1HGBH41JXMN109186'
      },
      originalInvoice: {
        fileName: 'original-estimate.pdf',
        subtotal: 601.65,
        tax: 36.99,
        total: 638.64,
        lineItems: [
          {
            id: 'oli-1',
            category: 'REAR BUMPER',
            description: 'Rear Bumper Cover',
            quantity: 1,
            price: 250.00,
            total: 250.00
          },
          {
            id: 'oli-2',
            category: 'LABOR',
            description: 'Body Labor',
            quantity: 2.5,
            price: 120.00,
            total: 300.00,
            laborHours: 2.5
          },
          {
            id: 'oli-3',
            category: 'PAINT',
            description: 'Paint Materials',
            quantity: 1,
            price: 51.65,
            total: 51.65
          }
        ],
        // TOTALS SUMMARY for Original Invoice
        totalsSummary: {
          categories: [
            { category: 'Parts', basis: '', rate: '', cost: 250.00 },
            { category: 'Body Labor', basis: '2.5 hrs', rate: '$ 120.00 /hr', cost: 300.00 },
            { category: 'Paint Supplies', basis: '1.0 hrs', rate: '$ 51.65 /hr', cost: 51.65 }
          ],
          subtotal: 601.65,
          salesTax: 36.99,
          salesTaxRate: 6.15,
          salesTaxBasis: 601.65,
          totalAmount: 638.64
        }
      },
      supplementInvoice: {
        fileName: 'supplement-001.pdf',
        subtotal: 1119.90,
        tax: 31.80,
        total: 1680.34,
        lineItems: [
          {
            id: 'sli-1',
            category: 'REAR BUMPER',
            description: 'Rear Bumper Cover',
            quantity: 1,
            price: 250.00,
            total: 250.00
          },
          {
            id: 'sli-2',
            category: 'LABOR',
            description: 'Body Labor',
            quantity: 2.5,
            price: 120.00,
            total: 300.00,
            laborHours: 2.5
          },
          {
            id: 'sli-3',
            category: 'PAINT',
            description: 'Paint Materials',
            quantity: 1,
            price: 51.65,
            total: 51.65
          },
          {
            id: 'sli-4',
            category: 'QUARTER PANEL',
            description: 'Quarter Panel Repair',
            quantity: 1,
            price: 450.00,
            total: 450.00,
            isNew: true
          },
          {
            id: 'sli-5',
            category: 'LABOR',
            description: 'Additional Body Labor',
            quantity: 1.5,
            price: 120.00,
            total: 180.00,
            laborHours: 1.5,
            isNew: true
          }
        ],
        // TOTALS SUMMARY for Supplement Invoice
        totalsSummary: {
          categories: [
            { category: 'Parts', basis: '', rate: '', cost: 298.44 },
            { category: 'Body Labor', basis: '15.4 hrs', rate: '$ 120.00 /hr', cost: 1848.00 },
            { category: 'Paint Labor', basis: '10.9 hrs', rate: '$ 120.00 /hr', cost: 1308.00 },
            { category: 'Mechanical Labor', basis: '1.0 hrs', rate: '$ 200.00 /hr', cost: 200.00 },
            { category: 'Additional Supplement Labor', basis: '', rate: '', cost: -944.70 },
            { category: 'Paint Supplies', basis: '10.9 hrs', rate: '$ 42.00 /hr', cost: 457.80 },
            { category: 'Additional Supplement Materials/Supplies', basis: '', rate: '', cost: -235.20 },
            { category: 'Miscellaneous', basis: '', rate: '', cost: 89.95 }
          ],
          subtotal: 3022.29,
          salesTax: 46.89,
          salesTaxRate: 9.0000,
          salesTaxBasis: 521.04,
          totalAmount: 3069.18,
          netCostOfSupplement: 3069.18
        }
      },
      fraudScore: 0,
      fraudReasons: [],
      invoiceSummary: 'Test data for TOTALS SUMMARY table rendering',
      changesSummary: {
        totalNewItems: 2,
        totalRemovedItems: 0,
        totalChangedItems: 0,
        totalUnchangedItems: 3,
        totalAmountChange: 1041.70,
        percentageChange: 163.13
      }
    };

    console.log('=== GENERATING TEST PDF WITH TOTALS SUMMARY ===');
    console.log('Original Invoice totalsSummary:', mockClaimData.originalInvoice.totalsSummary);
    console.log('Supplement Invoice totalsSummary:', mockClaimData.supplementInvoice.totalsSummary);
    console.log('===============================================');

    // Generate the PDF
    generateImprovedPdfReport(mockClaimData);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Test TOTALS SUMMARY Table in PDF</h2>
      <p>
        This test component generates a PDF with mock data that includes TOTALS SUMMARY tables
        for both the Original Invoice and Supplement Invoice sections.
      </p>
      
      <div style={{ 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px' 
      }}>
        <h3 style={{ marginTop: 0, color: '#0369a1' }}>What to Expect:</h3>
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Original Invoice Section:</strong> Will show a TOTALS SUMMARY table with 3 categories (Parts, Body Labor, Paint Supplies)</li>
          <li><strong>Supplement Invoice Section:</strong> Will show a TOTALS SUMMARY table with 8 categories including negative amounts</li>
          <li><strong>Table Format:</strong> Category | Basis | Rate | Cost $ columns</li>
          <li><strong>Totals:</strong> Subtotal, Sales Tax, Total Amount, and NET COST OF SUPPLEMENT</li>
        </ul>
      </div>

      <button
        onClick={generateTestPdf}
        style={{
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}
        onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}
      >
        Generate Test PDF with TOTALS SUMMARY
      </button>

      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#fef3c7', 
        border: '1px solid #f59e0b', 
        borderRadius: '8px' 
      }}>
        <h4 style={{ marginTop: 0, color: '#92400e' }}>📝 Note:</h4>
        <p style={{ marginBottom: 0 }}>
          Check the browser console (F12) for debug output showing the totalsSummary data being used.
          The PDF will download automatically when you click the button.
        </p>
      </div>
    </div>
  );
};