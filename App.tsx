import React, { useState } from 'react';
import { ClaimData } from './types';
import { analyzeClaimPackage } from './services/geminiService';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import ReviewDashboard from './components/ReviewDashboard';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        {isLoading ? (
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
