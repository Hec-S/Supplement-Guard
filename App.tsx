import React, { useState } from 'react';
import { ClaimData } from './types';
import { analyzeClaimPackage } from './services/geminiService';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import ReviewDashboard from './components/ReviewDashboard';
import TestAdvancedFraudDetection from './components/TestAdvancedFraudDetection';
import SimplePdfTest from './components/SimplePdfTest';
import PremiumPdfTest from './components/PremiumPdfTest';
import HiddenImageDemo from './components/HiddenImageDemo';
import ChangeFocusedPdfTest from './components/ChangeFocusedPdfTest';
import TestEnhancedInvoiceViewer from './components/TestEnhancedInvoiceViewer';
import { TestImprovedOCR } from './components/TestImprovedOCR';
import { TestTotalsSummary } from './components/TestTotalsSummary';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestMode, setShowTestMode] = useState<boolean>(false);
  const [testModeType, setTestModeType] = useState<'fraud' | 'pdf' | 'premium' | 'hidden' | 'changes' | 'invoice' | 'ocr' | 'totals'>('fraud');

  // Check for test mode in URL parameters
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('test');
    const testMode = testParam === 'fraud' || testParam === 'pdf' || testParam === 'premium' || testParam === 'hidden' || testParam === 'changes' || testParam === 'invoice' || testParam === 'ocr' || testParam === 'totals' || window.location.pathname.includes('/test');
    setShowTestMode(testMode);
    if (testParam === 'pdf') {
      setTestModeType('pdf');
    } else if (testParam === 'premium') {
      setTestModeType('premium');
    } else if (testParam === 'hidden') {
      setTestModeType('hidden');
    } else if (testParam === 'changes') {
      setTestModeType('changes');
    } else if (testParam === 'invoice') {
      setTestModeType('invoice');
    } else if (testParam === 'ocr') {
      setTestModeType('ocr');
    } else if (testParam === 'totals') {
      setTestModeType('totals');
    }
  }, []);

  const handleClaimAnalysis = async (originalFiles: File[], supplementFiles: File[]) => {
    if (originalFiles.length === 0 || supplementFiles.length === 0) {
        setError('Please upload files for both original and supplement claims.');
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const claimDataFromAI = await analyzeClaimPackage(originalFiles, supplementFiles);
      setClaimData(claimDataFromAI);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unknown error occurred. Please check the console for details.';
      setError(`Analysis Failed: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setClaimData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Header onReset={handleReset} showReset={!!claimData || isLoading} />
      <main className="container mx-auto p-4 md:p-8">
        {showTestMode ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                {testModeType === 'premium'
                  ? '✨ Premium PDF Generation Test Mode'
                  : testModeType === 'pdf'
                    ? 'PDF Generation Test Mode'
                    : testModeType === 'hidden'
                      ? '🔒 Hidden Image System Test Mode'
                      : testModeType === 'changes'
                        ? '🤖 AI Change Analysis PDF Test Mode'
                        : testModeType === 'invoice'
                          ? '📊 Enhanced Invoice Viewer Test Mode'
                          : testModeType === 'ocr'
                            ? '🔍 Improved OCR Line Item Comparison Test Mode'
                            : testModeType === 'totals'
                              ? '📊 TOTALS SUMMARY Table Test Mode'
                              : 'Advanced Fraud Detection Test Mode'
                }
              </h2>
              <p className="text-blue-700 text-sm">
                {testModeType === 'premium'
                  ? 'Testing visually stunning PDF output with professional formatting, dynamic color-coding, and elegant design elements.'
                  : testModeType === 'pdf'
                    ? 'Testing PDF generation services with fixed text truncation issues.'
                    : testModeType === 'hidden'
                      ? 'Testing complete visual concealment of sensitive images while maintaining system accessibility for backend processing.'
                      : testModeType === 'changes'
                        ? 'Testing AI-focused PDF generation that shows only document changes with color coding (red: new, orange: changed).'
                        : testModeType === 'invoice'
                          ? 'Testing enhanced invoice viewer with new column order: Description, Original Price, Price Change, New Price, Status.'
                          : testModeType === 'ocr'
                            ? 'Testing improved OCR that focuses on line item comparison only, tracking what changed between original and supplement packages.'
                            : testModeType === 'totals'
                              ? 'Testing TOTALS SUMMARY table rendering in PDF with mock data showing category breakdown (Parts, Labor, Supplies, etc.).'
                              : 'Testing comprehensive fraud detection algorithms with sample data scenarios.'
                }
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setTestModeType('fraud')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'fraud'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                  }`}
                >
                  Fraud Detection
                </button>
                <button
                  onClick={() => setTestModeType('pdf')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'pdf'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                  }`}
                >
                  PDF Generation
                </button>
                <button
                  onClick={() => setTestModeType('premium')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'premium'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gradient-to-r from-purple-200 to-pink-200 text-purple-800 hover:from-purple-300 hover:to-pink-300'
                  }`}
                >
                  ✨ Premium PDF
                </button>
                <button
                  onClick={() => setTestModeType('hidden')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'hidden'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  🔒 Hidden Images
                </button>
                <button
                  onClick={() => setTestModeType('changes')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'changes'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-200 text-green-800 hover:bg-green-300'
                  }`}
                >
                  🤖 AI Changes
                </button>
                <button
                  onClick={() => setTestModeType('invoice')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'invoice'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300'
                  }`}
                >
                  📊 Invoice Viewer
                </button>
                <button
                  onClick={() => setTestModeType('ocr')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'ocr'
                      ? 'bg-teal-600 text-white'
                      : 'bg-teal-200 text-teal-800 hover:bg-teal-300'
                  }`}
                >
                  🔍 Improved OCR
                </button>
                <button
                  onClick={() => setTestModeType('totals')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    testModeType === 'totals'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                  }`}
                >
                  📊 Totals Summary
                </button>
                <button
                  onClick={() => setShowTestMode(false)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors ml-auto"
                >
                  Exit Test Mode
                </button>
              </div>
            </div>
            {testModeType === 'fraud'
              ? <TestAdvancedFraudDetection />
              : testModeType === 'premium'
                ? <PremiumPdfTest />
                : testModeType === 'hidden'
                  ? <HiddenImageDemo />
                  : testModeType === 'changes'
                    ? <ChangeFocusedPdfTest />
                    : testModeType === 'invoice'
                      ? <TestEnhancedInvoiceViewer />
                      : testModeType === 'ocr'
                        ? <TestImprovedOCR />
                        : testModeType === 'totals'
                          ? <TestTotalsSummary />
                          : <SimplePdfTest />
            }
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Spinner />
            <p className="mt-4 text-lg text-slate-600">Analyzing claim packages...</p>
            <p className="mt-2 text-sm text-slate-500">Parsing invoices and calculating fraud score.</p>
          </div>
        ) : error ? (
           <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
             <p className="text-red-600 font-semibold">{error}</p>
             <button onClick={handleReset} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                Try Again
             </button>
           </div>
        ) : claimData ? (
          <ReviewDashboard claimData={claimData} />
        ) : (
          <UploadForm onAnalyze={handleClaimAnalysis} />
        )}
      </main>
    </div>
  );
};

export default App;
