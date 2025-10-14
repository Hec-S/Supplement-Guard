import React from 'react';

interface FraudScoreCardProps {
  score: number;
  reasons: string[];
}

const FraudScoreCard: React.FC<FraudScoreCardProps> = ({ score, reasons }) => {
  const getScoreColor = () => {
    if (score > 75) return 'text-red-500';
    if (score > 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBackgroundColor = () => {
    if (score > 75) return 'bg-red-100 border-red-200';
    if (score > 40) return 'bg-yellow-100 border-yellow-200';
    return 'bg-green-100 border-green-200';
  }
  
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 h-full">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Fraud Score Analysis</h3>
      
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-40 h-40">
           <svg className="w-full h-full" viewBox="0 0 100 100">
             {/* Background circle */}
             <circle
               className="text-slate-200"
               strokeWidth="10"
               stroke="currentColor"
               fill="transparent"
               r="45"
               cx="50"
               cy="50"
             />
             {/* Progress circle */}
             <circle
               className={`${getScoreColor()} transition-all duration-1000 ease-out`}
               strokeWidth="10"
               strokeDasharray={circumference}
               strokeDashoffset={offset}
               strokeLinecap="round"
               stroke="currentColor"
               fill="transparent"
               r="45"
               cx="50"
               cy="50"
               transform="rotate(-90 50 50)"
             />
           </svg>
           <span className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${getScoreColor()}`}>
             {score}
           </span>
         </div>
      </div>
      
      <div className={`p-4 rounded-lg border ${getBackgroundColor()}`}>
          <h4 className="font-semibold text-slate-800 mb-3">Top Contributing Factors:</h4>
          <ul className="space-y-2">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full ${getScoreColor().replace('text','bg')} bg-opacity-30 text-xs flex items-center justify-center mr-3 mt-0.5`}>
                  !
                </span>
                <span className="text-sm text-slate-700">{reason}</span>
              </li>
            ))}
          </ul>
      </div>

    </div>
  );
};

export default FraudScoreCard;
