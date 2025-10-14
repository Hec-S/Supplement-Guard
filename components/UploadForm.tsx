import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import Button from './Button';

interface UploadFormProps {
  onAnalyze: (originalFiles: File[], supplementFiles: File[]) => void;
}

const FileInputArea: React.FC<{
  id: string;
  title: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}> = ({ id, title, files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesChange(Array.from(e.dataTransfer.files));
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesChange(Array.from(e.target.files));
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-slate-700">{title}</h3>
      <label
        htmlFor={id}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-100'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-slate-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">PDF invoices</p>
        </div>
        <input id={id} type="file" className="hidden" multiple onChange={handleFileChange} accept=".pdf" />
      </label>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center bg-slate-100 p-2 rounded-md text-sm">
              <FileIcon />
              <span className="ml-2 text-slate-700 truncate">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const UploadForm: React.FC<UploadFormProps> = ({ onAnalyze }) => {
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [supplementFiles, setSupplementFiles] = useState<File[]>([]);

  const handleAnalyzeClick = () => {
    onAnalyze(originalFiles, supplementFiles);
  };
  
  const canAnalyze = originalFiles.length > 0 && supplementFiles.length > 0;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Analyze Supplement Claim</h2>
        <p className="mt-2 text-slate-500">Upload the original and supplement claim invoices to begin the analysis.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <FileInputArea id="originalFiles" title="Original Claim Package" files={originalFiles} onFilesChange={setOriginalFiles} />
        <FileInputArea id="supplementFiles" title="Supplement Claim Package" files={supplementFiles} onFilesChange={setSupplementFiles} />
      </div>
      <div className="text-center">
        <Button onClick={handleAnalyzeClick} disabled={!canAnalyze}>
          Analyze Claim
        </Button>
      </div>
    </div>
  );
};

export default UploadForm;
