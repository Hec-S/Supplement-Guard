import React, { useState } from 'react';
import { ImagePair } from '../types';

interface ImageViewerProps {
  imagePairs: ImagePair[];
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imagePairs }) => {
  const [selectedPair, setSelectedPair] = useState<ImagePair | null>(imagePairs.length > 0 ? imagePairs[0] : null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  if (!selectedPair) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Image Comparison</h3>
            <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg">
                <p className="text-slate-500">No images were provided for comparison.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800">Image Comparison</h3>
        <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-600">Damage Heatmap</span>
            <label htmlFor="heatmap-toggle" className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="heatmap-toggle" className="sr-only peer" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-center font-semibold text-slate-600 mb-2">Original</h4>
          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200">
             <img src={selectedPair.originalUrl} alt="Original Claim" className="w-full h-full object-cover"/>
          </div>
        </div>
        <div>
          <h4 className="text-center font-semibold text-slate-600 mb-2">Supplement</h4>
          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200">
             <img src={selectedPair.supplementUrl} alt="Supplement Claim" className="w-full h-full object-cover"/>
             {showHeatmap && (
                <img 
                    src={selectedPair.heatmapUrl} 
                    alt="Damage Heatmap" 
                    className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-multiply"
                />
             )}
          </div>
        </div>
      </div>
      <p className="text-center text-slate-500 mb-4">{selectedPair.description}</p>

      <div className="flex justify-center space-x-2 p-2 bg-slate-100 rounded-lg">
        {imagePairs.map((pair) => (
          <button 
            key={pair.id} 
            onClick={() => setSelectedPair(pair)}
            className={`w-20 h-14 rounded-md overflow-hidden transition-all duration-200 ${selectedPair.id === pair.id ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:opacity-80'}`}
          >
            <img src={pair.originalUrl} alt={pair.description} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageViewer;