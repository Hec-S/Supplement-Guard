import React from 'react';
import { ClaimData } from '../types';
import FraudScoreCard from './FraudScoreCard';
import InvoiceViewer from './InvoiceViewer';
import Button from './Button';
import { DownloadIcon } from './icons/DownloadIcon';
import { generatePdfReport } from '../services/pdfService';

interface ReviewDashboardProps {
  claimData: ClaimData;
}

const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ claimData }) => {

  const handleDecision = (decision: 'Approved' | 'Rejected') => {
    alert(`Claim ${claimData.id} has been ${decision}.`);
  };

  const handleExport = () => {
    generatePdfReport(claimData);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h2 className="text-3xl font-bold text-slate-800">Review for Claim: {claimData.id}</h2>
           <p className="text-slate-500 mt-1">Review the AI-powered analysis below and make a decision.</p>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <Button onClick={() => handleDecision('Approved')} variant="primary">Approve</Button>
          <Button onClick={() => handleDecision('Rejected')} variant="danger">Reject</Button>
          <Button onClick={handleExport} variant="secondary" size="md">
            <DownloadIcon />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <FraudScoreCard score={claimData.fraudScore} reasons={claimData.fraudReasons} />
        </div>
        <div className="lg:col-span-2">
          <InvoiceViewer 
            originalInvoice={claimData.originalInvoice} 
            supplementInvoice={claimData.supplementInvoice}
            summary={claimData.invoiceSummary} 
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewDashboard;