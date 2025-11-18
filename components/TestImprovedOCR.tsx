import React, { useState } from 'react';
import { analyzeClaimPackage } from '../services/geminiService';
import { generateCategorizedPdfReport, generateCategorizedCsvReport } from '../services/categorizedPdfService';
import { ClaimData } from '../types';

export const TestImprovedOCR: React.FC = () => {
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [supplementFiles, setSupplementFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOriginalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setOriginalFiles(Array.from(e.target.files));
    }
  };

  const handleSupplementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSupplementFiles(Array.from(e.target.files));
    }
  };

  const handleAnalyze = async () => {
    if (originalFiles.length === 0 || supplementFiles.length === 0) {
      setError('Please select both original and supplement files');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeClaimPackage(originalFiles, supplementFiles);
      setResult(analysisResult);
      console.log('Analysis Result:', analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      console.error('Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!result) return;
    try {
      generateCategorizedPdfReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      console.error('PDF Generation Error:', err);
    }
  };

  const handleGenerateCsv = () => {
    if (!result) return;
    try {
      generateCategorizedCsvReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate CSV');
      console.error('CSV Generation Error:', err);
    }
  };

  const renderLineItemComparison = () => {
    if (!result) return null;

    const originalItems = result.originalInvoice.lineItems;
    const supplementItems = result.supplementInvoice.lineItems;

    // Group items by category
    const groupedItems = supplementItems.reduce((acc, item) => {
      const category = item.category || 'UNCATEGORIZED';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof supplementItems>);

    // Also group removed items from original
    const removedItems = originalItems.filter(item => 
      !supplementItems.some(supp => 
        supp.description.toLowerCase() === item.description.toLowerCase()
      )
    );

    const removedGrouped = removedItems.reduce((acc, item) => {
      const category = item.category || 'UNCATEGORIZED';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...item, isRemoved: true });
      return acc;
    }, {} as Record<string, typeof originalItems>);

    // Merge all categories
    const allCategories = new Set([...Object.keys(groupedItems), ...Object.keys(removedGrouped)]);

    return (
      <div className="mt-6 space-y-6">
        {/* Changes Summary */}
        {result.changesSummary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Changes Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-green-600">
                  {result.changesSummary.totalNewItems}
                </div>
                <div className="text-sm text-gray-600">New Items</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-red-600">
                  {result.changesSummary.totalRemovedItems}
                </div>
                <div className="text-sm text-gray-600">Removed Items</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {result.changesSummary.totalChangedItems}
                </div>
                <div className="text-sm text-gray-600">Changed Items</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-gray-600">
                  {result.changesSummary.totalUnchangedItems}
                </div>
                <div className="text-sm text-gray-600">Unchanged Items</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-blue-600">
                  ${Math.abs(result.changesSummary.totalAmountChange).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Total {result.changesSummary.totalAmountChange >= 0 ? 'Increase' : 'Decrease'}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {result.changesSummary.percentageChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Percentage Change</div>
              </div>
            </div>
          </div>
        )}

        {/* Line Items Comparison by Category */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Line Items Comparison by Category</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {Array.from(allCategories).sort().map(category => {
              const categoryItems = groupedItems[category] || [];
              const categoryRemovedItems = removedGrouped[category] || [];
              const allCategoryItems = [...categoryItems, ...categoryRemovedItems];

              if (allCategoryItems.length === 0) return null;

              return (
                <div key={category} className="p-4">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg bg-gray-100 px-3 py-2 rounded">
                    {category}
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Line
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Operation
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Labor Hrs
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paint Hrs
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allCategoryItems.map((item, index) => {
                          let rowClass = '';
                          let statusBadge = '';
                          let statusColor = '';

                          if (item.isNew) {
                            rowClass = 'bg-green-50';
                            statusBadge = 'NEW';
                            statusColor = 'bg-green-100 text-green-800';
                          } else if (item.isRemoved) {
                            rowClass = 'bg-red-50';
                            statusBadge = 'REMOVED';
                            statusColor = 'bg-red-100 text-red-800';
                          } else if (item.isChanged) {
                            rowClass = 'bg-orange-50';
                            statusBadge = 'CHANGED';
                            statusColor = 'bg-orange-100 text-orange-800';
                          } else {
                            statusBadge = 'UNCHANGED';
                            statusColor = 'bg-gray-100 text-gray-800';
                          }

                          return (
                            <tr key={`${category}-${index}`} className={rowClass}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.lineNumber || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.operation || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.description}
                                {item.isChanged && item.originalQuantity !== undefined && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Was: {item.originalQuantity} × ${item.originalPrice?.toFixed(2)} = ${item.originalTotal?.toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                ${item.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                ${item.total.toFixed(2)}
                                {item.totalChange !== undefined && item.totalChange !== 0 && (
                                  <div className={`text-xs ${item.totalChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {item.totalChange > 0 ? '+' : ''}${item.totalChange.toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.laborHours || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.paintHours || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                  {statusBadge}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis Summary</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{result.invoiceSummary}</p>
        </div>

        {/* Totals Comparison */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Totals Comparison</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Original Invoice</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${result.originalInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${result.originalInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">${result.originalInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Supplement Invoice</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${result.supplementInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${result.supplementInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">${result.supplementInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Workfile Total Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Complete Workfile Total</h4>
              <div className="text-sm text-blue-700 mb-2">
                (Original Estimate + All Supplements)
              </div>
              <div className="text-3xl font-bold text-blue-900">
                ${result.supplementInvoice.total.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600 mt-2">
                This is the complete claim total including all supplements
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Test Improved OCR - Line Item Comparison with Categories
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Invoice Files
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleOriginalFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {originalFiles.length > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                {originalFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplement Invoice Files
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleSupplementFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {supplementFiles.length > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                {supplementFiles.length} file(s) selected
              </p>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || originalFiles.length === 0 || supplementFiles.length === 0}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Line Item Changes'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {result && (
          <>
            {renderLineItemComparison()}
            
            {/* Export Buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={handleGeneratePdf}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Categorized PDF Report
              </button>
              
              <button
                onClick={handleGenerateCsv}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};