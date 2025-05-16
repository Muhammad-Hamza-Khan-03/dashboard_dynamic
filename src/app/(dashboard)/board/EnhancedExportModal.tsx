// Modified EnhancedExportModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader, Camera, FileDown, Info, FileText } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: any) => void;
  userId: string | undefined;
  currentDashboardId: string | null;
  currentDashboardName: string;
  charts: any[];
  textBoxes: any[];
  dataTables: any[];
  statCards: any[];
  isProcessing?: boolean;
  error?: string | null;
  progress?: string;
  hasSavedImages?: boolean;
}

const EnhancedExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  userId,
  currentDashboardId,
  currentDashboardName,
  charts,
  textBoxes,
  dataTables,
  statCards,
  isProcessing = false,
  error = null,
  progress = '',
  hasSavedImages = false
}) => {
  // Export configuration
  const [exportName, setExportName] = useState('');
  const [useRelativePositioning, setUseRelativePositioning] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('pdf'); // New: default to PDF, can be 'pdf' or 'mdx'
  
  // Initialize default values when the modal opens
  useEffect(() => {
    if (isOpen) {
      setExportName(`${currentDashboardName} Export`);
      setUseRelativePositioning(true);
      setInternalError(null);
      setExportFormat('pdf'); // Reset format when reopening
    }
  }, [isOpen, currentDashboardName]);
  
  const handleExport = () => {
    if (!exportName.trim()) {
      setInternalError("Please provide a name for the export");
      return;
    }
    
    setInternalError(null);
    
    // Call the parent's onExport function with the configuration
    onExport({
      exportName: exportName,
      useRelativePositioning: useRelativePositioning,
      exportFormat: exportFormat, // Include the export format in the config
    });
  };
  
  // Calculate counts for dashboard elements
  const chartCount = charts.length;
  const textBoxCount = textBoxes.length;
  const dataTableCount = dataTables.length;
  const statCardCount = statCards.length;
  const totalCount = chartCount + textBoxCount + dataTableCount + statCardCount;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Dashboard</DialogTitle>
        </DialogHeader>
        <h1>EnhancedExportModal Openened</h1>
        <div className="py-4 space-y-5">
          {/* Export Name */}
          <div>
            <Label htmlFor="export-name">Export Name</Label>
            <Input 
              id="export-name"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder="Enter a name for this export"
              className="mt-1"
            />
          </div>
          
          
          {/* Export Format Selection */}
          <div>
            <Label htmlFor="export-format">Export Format</Label>
            <Select 
              value={exportFormat} 
              onValueChange={setExportFormat}
            >
              <SelectTrigger id="export-format" className="mt-1">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    <span>PDF Document</span>
                  </div>
                </SelectItem>
                <SelectItem value="mdx">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>MDX (Markdown + JSX)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {exportFormat === 'pdf' ? 
                'Creates a PDF document with all dashboard elements' : 
                'Creates an MDX file with images and JSX layout for React'}
            </p>
          </div>
          
          {/* Pre-rendered images status */}
          {hasSavedImages && (
            <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="mr-3 mt-0.5">
                <div className="bg-green-100 p-1 rounded-full">
                  <Camera className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800">Pre-rendered Images Available</h3>
                <p className="text-xs text-green-700 mt-1">
                  This dashboard has saved images which will be used for the export,
                  making the process faster and more reliable.
                </p>
              </div>
            </div>
          )}
          
          {!hasSavedImages && (
            <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="mr-3 mt-0.5">
                <Info className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">No Pre-rendered Images</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  This dashboard has no saved images. Charts will be captured live during export.
                  Consider using the 'Save' button before exporting for better results.
                </p>
              </div>
            </div>
          )}
          
          {/* Dashboard Summary */}
          <div className="p-3 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Dashboard Summary</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>Charts: {chartCount}</li>
              <li>Text Boxes: {textBoxCount}</li>
              <li>Data Tables: {dataTableCount}</li>
              <li>Stat Cards: {statCardCount}</li>
              <li className="font-medium">Total Items: {totalCount}</li>
            </ul>
          </div>
          
          {/* Layout Options */}
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="relative-positioning" 
                checked={useRelativePositioning} 
                onCheckedChange={(checked) => setUseRelativePositioning(!!checked)} 
              />
              <Label htmlFor="relative-positioning">Use relative positioning(recommended)</Label>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Preserves the layout of your dashboard elements relative to each other
            </p>
          </div>
          
          {/* Progress indicator */}
          {isProcessing && progress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center mb-2">
                <Loader className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                <h3 className="text-sm font-medium text-blue-700">Processing</h3>
              </div>
              <p className="text-sm text-blue-600">{progress}</p>
            </div>
          )}
          
          {/* Error display */}
          {(error || internalError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Export Error</AlertTitle>
              <AlertDescription>{error || internalError}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isProcessing}
          >
            {isProcessing ? 'Please wait...' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!exportName.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                {exportFormat === 'pdf' ? (
                  <FileDown className="h-4 w-4 mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedExportModal;