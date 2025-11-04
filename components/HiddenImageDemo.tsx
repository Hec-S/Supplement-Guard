import React, { useRef, useEffect, useState } from 'react';
import HiddenImage, { HiddenImageRef } from './HiddenImage';
import { hiddenImageService } from '../services/hiddenImageService';
import { findAllHiddenImages, getHiddenImageData } from '../utils/hiddenImageUtils';

interface DemoState {
  hiddenImagesCount: number;
  processedData: any[];
  isMonitoring: boolean;
  lastProcessingTime: number;
  exportData: string | null;
}

/**
 * HiddenImageDemo Component
 * 
 * Demonstrates the complete hidden image system with fraud detection metrics.
 * Shows how images can be completely hidden from users while remaining
 * accessible for backend processing and system operations.
 */
const HiddenImageDemo: React.FC = () => {
  const hiddenImageRef = useRef<HiddenImageRef>(null);
  const [demoState, setDemoState] = useState<DemoState>({
    hiddenImagesCount: 0,
    processedData: [],
    isMonitoring: false,
    lastProcessingTime: 0,
    exportData: null,
  });
  const [selectedHideMethod, setSelectedHideMethod] = useState<'visibility' | 'display' | 'opacity' | 'position' | 'clip' | 'transform' | 'aria-hidden'>('visibility');
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  // Fraud detection metrics from the attached image
  const fraudMetrics = {
    fraudScore: 80,
    riskLevel: 'MODERATE' as const,
    variance: 2702.69,
    variancePercentage: 326.9,
    matchPercentage: 16.7,
    issuesCount: 2,
    anomaliesCount: 5,
    timestamp: Date.now(),
  };

  // Create a data URL for the fraud metrics (simulating the attached image)
  const createFraudMetricsDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 800;
    canvas.height = 100;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw fraud metrics similar to the attached image
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';

    // Fraud score
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(20, 20, 80, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Fraud: 80', 25, 40);

    // Risk level
    ctx.fillStyle = '#28a745';
    ctx.fillRect(120, 20, 120, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Risk: MODERATE', 125, 40);

    // Variance
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(260, 20, 150, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Variance: +$2,702.69', 265, 40);

    // Match percentage
    ctx.fillStyle = '#007bff';
    ctx.fillRect(430, 20, 100, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Match: 16.7%', 435, 40);

    // Issues
    ctx.fillStyle = '#fd7e14';
    ctx.fillRect(550, 20, 80, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Issues: 2', 555, 40);

    // Anomalies
    ctx.fillStyle = '#6f42c1';
    ctx.fillRect(650, 20, 100, 30);
    ctx.fillStyle = 'white';
    ctx.fillText('Anomalies: 5', 655, 40);

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    // Update hidden images count
    const updateCount = () => {
      const count = findAllHiddenImages().length;
      setDemoState(prev => ({ ...prev, hiddenImagesCount: count }));
    };

    updateCount();
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleProcessHiddenImages = async () => {
    const startTime = Date.now();
    try {
      const results = await hiddenImageService.batchProcessFraudDetection({
        includeMetadata: true,
        includeAnalysis: true,
      });

      const processedData = results
        .filter(result => result.success)
        .map(result => result.data);

      setDemoState(prev => ({
        ...prev,
        processedData,
        lastProcessingTime: Date.now() - startTime,
      }));
    } catch (error) {
      console.error('Error processing hidden images:', error);
    }
  };

  const handleExtractSensitiveData = async () => {
    try {
      const result = await hiddenImageService.extractSensitiveData();
      if (result.success) {
        console.log('Extracted sensitive data:', result.data);
        alert(`Extracted data from ${result.data.processedImages} hidden images. Check console for details.`);
      }
    } catch (error) {
      console.error('Error extracting sensitive data:', error);
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'xml') => {
    try {
      const result = await hiddenImageService.exportProcessedData(format);
      if (result.success) {
        setDemoState(prev => ({ ...prev, exportData: result.data.content }));
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleStartMonitoring = () => {
    if (demoState.isMonitoring) return;

    const stopMonitoring = hiddenImageService.startMonitoring(
      (data) => {
        console.log('Monitoring update:', data);
        setDemoState(prev => ({
          ...prev,
          processedData: data.data,
        }));
      },
      { interval: 3000, autoProcess: true }
    );

    setDemoState(prev => ({ ...prev, isMonitoring: true }));

    // Store stop function for cleanup
    (window as any).stopHiddenImageMonitoring = stopMonitoring;
  };

  const handleStopMonitoring = () => {
    if ((window as any).stopHiddenImageMonitoring) {
      (window as any).stopHiddenImageMonitoring();
      delete (window as any).stopHiddenImageMonitoring;
    }
    setDemoState(prev => ({ ...prev, isMonitoring: false }));
  };

  const handleImageLoad = (element: HTMLImageElement) => {
    console.log('Hidden image loaded:', {
      src: element.src,
      dimensions: { width: element.naturalWidth, height: element.naturalHeight },
      metadata: getHiddenImageData(element),
    });
  };

  return (
    <div className="hidden-image-demo" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Hidden Image System Demonstration</h2>
      <p>This demo shows how sensitive fraud detection metrics can be completely hidden from users while remaining accessible to the system.</p>

      {/* Control Panel */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3>System Controls</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            Hide Method: 
            <select 
              value={selectedHideMethod} 
              onChange={(e) => setSelectedHideMethod(e.target.value as any)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="visibility">Visibility Hidden</option>
              <option value="display">Display None</option>
              <option value="opacity">Opacity Zero</option>
              <option value="position">Absolute Position</option>
              <option value="clip">CSS Clip</option>
              <option value="transform">Transform Scale</option>
              <option value="aria-hidden">ARIA Hidden</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleProcessHiddenImages} style={{ padding: '8px 16px' }}>
            Process Hidden Images
          </button>
          <button onClick={handleExtractSensitiveData} style={{ padding: '8px 16px' }}>
            Extract Sensitive Data
          </button>
          <button 
            onClick={demoState.isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: demoState.isMonitoring ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {demoState.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button onClick={() => setShowSystemInfo(!showSystemInfo)} style={{ padding: '8px 16px' }}>
            {showSystemInfo ? 'Hide' : 'Show'} System Info
          </button>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button onClick={() => handleExportData('json')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Export JSON
          </button>
          <button onClick={() => handleExportData('csv')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Export CSV
          </button>
          <button onClick={() => handleExportData('xml')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Export XML
          </button>
        </div>
      </div>

      {/* System Information */}
      {showSystemInfo && (
        <div style={{ 
          background: '#e9ecef', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ced4da'
        }}>
          <h3>System Information</h3>
          <ul>
            <li>Hidden Images Count: {demoState.hiddenImagesCount}</li>
            <li>Monitoring Status: {demoState.isMonitoring ? 'Active' : 'Inactive'}</li>
            <li>Last Processing Time: {demoState.lastProcessingTime}ms</li>
            <li>Processed Data Items: {demoState.processedData.length}</li>
          </ul>
        </div>
      )}

      {/* Processed Data Display */}
      {demoState.processedData.length > 0 && (
        <div style={{ 
          background: '#d4edda', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          <h3>Processed Data (Backend Accessible)</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(demoState.processedData, null, 2)}
          </pre>
        </div>
      )}

      {/* Export Data Display */}
      {demoState.exportData && (
        <div style={{ 
          background: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <h3>Exported Data</h3>
          <textarea 
            value={demoState.exportData} 
            readOnly 
            style={{ 
              width: '100%', 
              height: '150px', 
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          />
        </div>
      )}

      {/* Visual Demonstration Area */}
      <div style={{ 
        background: '#ffffff', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '2px solid #007bff',
        marginBottom: '20px'
      }}>
        <h3>Visual Area (User Interface)</h3>
        <p>This area represents what users see. The fraud detection image is completely hidden below:</p>
        
        <div style={{ 
          minHeight: '100px', 
          background: '#f8f9fa', 
          border: '1px dashed #6c757d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c757d'
        }}>
          No sensitive information visible to users
        </div>

        {/* Hidden Image - Completely invisible to users but accessible to system */}
        <HiddenImage
          ref={hiddenImageRef}
          src={createFraudMetricsDataUrl()}
          alt="Fraud Detection Metrics - Hidden from Users"
          id="fraud-metrics-hidden"
          hideMethod={selectedHideMethod}
          preserveSpace={false}
          enableProgrammaticAccess={true}
          metadata={{
            fraudScore: fraudMetrics.fraudScore.toString(),
            riskLevel: fraudMetrics.riskLevel,
            variance: fraudMetrics.variance.toString(),
            variancePercentage: fraudMetrics.variancePercentage.toString(),
            matchPercentage: fraudMetrics.matchPercentage.toString(),
            issuesCount: fraudMetrics.issuesCount.toString(),
            anomaliesCount: fraudMetrics.anomaliesCount.toString(),
            timestamp: fraudMetrics.timestamp.toString(),
            category: 'fraud-detection',
            sensitivity: 'high',
            department: 'risk-analysis',
          }}
          onLoad={handleImageLoad}
          onError={(error) => console.error('Hidden image load error:', error)}
        />
      </div>

      {/* Technical Details */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6'
      }}>
        <h3>Technical Implementation Details</h3>
        <ul>
          <li><strong>Complete Visual Concealment:</strong> Image is hidden using {selectedHideMethod} method</li>
          <li><strong>DOM Preservation:</strong> Image remains in DOM structure for system access</li>
          <li><strong>Metadata Storage:</strong> Fraud metrics stored as data attributes</li>
          <li><strong>Programmatic Access:</strong> Backend can process image data and metadata</li>
          <li><strong>No Layout Interference:</strong> Hidden image doesn't affect page layout</li>
          <li><strong>Accessibility Compliant:</strong> Properly hidden from screen readers when needed</li>
          <li><strong>Responsive Compatible:</strong> Works across all device sizes</li>
        </ul>
      </div>

      {/* Developer Tools */}
      <div style={{ 
        background: '#e9ecef', 
        padding: '15px', 
        borderRadius: '8px', 
        marginTop: '20px',
        border: '1px solid #ced4da'
      }}>
        <h3>Developer Tools</h3>
        <p>Open browser DevTools and run these commands in the console:</p>
        <code style={{ display: 'block', background: '#f8f9fa', padding: '10px', marginTop: '10px' }}>
          {`// Find all hidden images
document.querySelectorAll('img[data-hidden-image="true"]')

// Access hidden image data programmatically
import { findAllHiddenImages, getHiddenImageData } from './utils/hiddenImageUtils'
const hiddenImages = findAllHiddenImages()
hiddenImages.forEach(img => console.log(getHiddenImageData(img)))`}
        </code>
      </div>
    </div>
  );
};

export default HiddenImageDemo;