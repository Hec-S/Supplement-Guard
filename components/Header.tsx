import React from 'react';

interface HeaderProps {
    onReset: () => void;
    showReset: boolean;
}

const ShieldIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);


const Header: React.FC<HeaderProps> = ({ onReset, showReset }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <ShieldIcon />
          <h1 className="text-2xl font-bold text-slate-800">
            Supplement<span className="text-blue-600">Guard</span>
          </h1>
        </div>
        {showReset && (
             <button
                onClick={onReset}
                className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm"
            >
                Start New Review
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
