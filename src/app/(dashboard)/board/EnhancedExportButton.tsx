import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader, AlertCircle, Info, FileText } from 'lucide-react';
import EnhancedExportModal from './EnhancedExportModal';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { captureDashboardNodes } from './util-img-ext';

interface ExportButtonProps {
  userId: string | undefined;
  currentDashboardId: string | null;
  currentDashboardName: string;
  charts: any[];
  textBoxes: any[];
  dataTables: any[];
  statCards: any[];
  disabled?: boolean;
  usePreRendered?: boolean;
}

const EnhancedExportButton: React.FC<ExportButtonProps> = ({
  userId,
  currentDashboardId,
  currentDashboardName,
  charts,
  textBoxes,
  dataTables,
  statCards,
  disabled,
  usePreRendered = true
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [hasSavedImages, setHasSavedImages] = useState(false);
  
  // Check if the current dashboard has saved images
  useEffect(() => {
    const checkSavedImages = async () => {
      if (!userId || !currentDashboardId) return;
      
      try {
        const response = await fetch(`http://localhost:5000/check-dashboard-images/${userId}/${currentDashboardId}`);
        if (response.ok) {
          const data = await response.json();
          setHasSavedImages(data.hasSavedImages);
        }
      } catch (error) {
        console.error('Error checking for saved images:', error);
        setHasSavedImages(false);
      }
    };
    
    checkSavedImages();
  }, [userId, currentDashboardId]);

function calculateStatValue(card: { data: never[]; column: any; statType: any; }) {
  const data = card.data || [];
  const column = card.column;
  const statType = card.statType;
  
  if (!data.length || !column) return "N/A";
  
  try {
    // Extract values from the data
    const values = data.map(item => item[column]).filter(val => val !== null && val !== undefined);
    
    if (!values.length) return "N/A";
    
    switch (statType) {
      case 'count':
        return values.length.toFixed(2);
      case 'sum':
        return values.reduce((sum, val) => sum + Number(val), 0).toFixed(2);
      case 'mean':
        return (values.reduce((sum, val) => sum + Number(val), 0) / values.length).toFixed(2);
      case 'mode':
        const counts: Record<string | number, number> = {};
        values.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
        const mode = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        return mode;
      case 'max':
        return Math.max(...values.map(v => Number(v))).toFixed(2);
      case 'min':
        return Math.min(...values.map(v => Number(v))).toFixed(2);
      default:
        return "N/A";
    }
  } catch (e) {
    console.error("Error calculating stat value:", e);
    return "Error";
  }
}

const handleExport = async (exportConfig: any) => {
  if (!userId || !currentDashboardId) return;
  
  try {
    setIsExporting(true);
    setExportError(null);
    setExportProgress('Preparing export process...');
    
    const statCardData = statCards.map(card => ({
      id: card.id,
      title: card.title,
      value: calculateStatValue(card),  // New helper function to calculate the value
      statType: card.statType,
      column: card.column
    }));

    const dataTableData = dataTables.map(table => ({
      id: table.id,
      title: table.title,
      columns: table.columns,
      data: table.data
    }));

    // For visual feedback, make sure there's a small delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Determine which endpoint to use based on format
    let endpoint;
    
    if (exportConfig.exportFormat === 'mdx') {
      endpoint = `http://localhost:5000/export-dashboard-mdx/${userId}`;
      setExportProgress('Preparing MDX export...');
    } else {
      // PDF export - use pre-rendered if available
      endpoint = usePreRendered && hasSavedImages
        ? `http://localhost:5000/export-dashboard-pre-rendered/${userId}`
        : `http://localhost:5000/export-dashboard-images/${userId}`;
      
      setExportProgress(`Using ${usePreRendered && hasSavedImages ? 'pre-rendered' : 'live'} export method...`);
    }
    
    // Always capture node images to ensure we have all components (tables, text boxes, etc.)
    setExportProgress('Capturing dashboard elements as images...');
    const nodeImages = await captureDashboardNodes();
    
    setExportProgress(`Captured ${Object.keys(nodeImages).length} node images. Sending to server...`);
    
    // Prepare request data
    const requestData = {
      dashboard_ids: [currentDashboardId],
      dashboards: [{
        id: currentDashboardId,
        name: currentDashboardName
      }],
      export_name: exportConfig.exportName,
      use_relative_positioning: exportConfig.useRelativePositioning,
      export_format: exportConfig.exportFormat,
      node_images: nodeImages,
      stat_card_data: statCardData,
      data_table_data: dataTableData,
      node_positions: {
        charts: charts.map(chart => ({
          id: chart.id,
          position: chart.position,
          title: chart.title,
          description: chart.description || ''
        })),
        textBoxes: textBoxes.map(box => ({
          id: box.id,
          position: box.position,
          content: box.content
        })),
        dataTables: dataTables.map(table => ({
          id: table.id,
          position: table.position,
          title: table.title,
          columns: table.columns,
          data: table.data
        })),
        statCards: statCards.map(card => ({
          id: card.id,
          position: card.position,
          title: card.title,
          column: card.column,
          statType: card.statType
        }))
      }
    };
    
    setExportProgress(`Generating ${exportConfig.exportFormat.toUpperCase()} on server...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      throw new Error(`Export failed (Status: ${response.status})`);
    }
    
    const data = await response.json();
    setExportProgress(`${exportConfig.exportFormat.toUpperCase()} generated successfully! Opening download...`);
    
    // Open the download link in a new tab
    window.open(`http://localhost:5000${data.download_url}`, '_blank');
    
    // Reset progress after a short delay
    setTimeout(() => {
      setExportProgress('');
      setShowExportModal(false);
    }, 1500);
    
  } catch (error) {
    console.error('Error during export:', error);
    setExportError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    setIsExporting(false);
  }
};


  // Helper function to capture node images
  async function captureNodeImages() {
    setExportProgress('Capturing dashboard elements as images...');
    
    try {
      // Use the existing captureDashboardNodes function
      const nodeImages = await captureDashboardNodes();
      return nodeImages;
    } catch (error) {
      console.error('Error capturing node images:', error);
      throw new Error("Failed to capture dashboard images");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setExportError(null);
          setExportProgress('');
          setShowExportModal(true);
        }}
        disabled={disabled || !currentDashboardId || isExporting}
        className="flex items-center gap-1 relative"
      >
        {isExporting ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {isExporting ? 'Exporting...' : 'Export'}
        
        {/* Indicator if we have saved images */}
        {hasSavedImages && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </Button>
      
      {showExportModal && (
        <EnhancedExportModal
          isOpen={showExportModal}
          onClose={() => {
            if (!isExporting) {
              setShowExportModal(false);
              setExportError(null);
              setExportProgress('');
            }
          }}
          onExport={handleExport}
          userId={userId}
          currentDashboardId={currentDashboardId}
          currentDashboardName={currentDashboardName}
          charts={charts}
          textBoxes={textBoxes}
          dataTables={dataTables}
          statCards={statCards}
          isProcessing={isExporting}
          error={exportError}
          progress={exportProgress}
          hasSavedImages={hasSavedImages}
        />
      )}
    </>
  );
};

export default EnhancedExportButton;