import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Check, Loader, X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SaveDashboardButtonProps {
  userId: string | undefined;
  currentDashboardId: string | null;
  currentDashboardName: string;
  charts: any[];
  disabled?: boolean;
}

/**
 * A button that captures the current state of all charts in the dashboard
 * and stores them in the database for later export.
 */
const SaveDashboardButton: React.FC<SaveDashboardButtonProps> = ({
  userId,
  currentDashboardId,
  currentDashboardName,
  charts,
  disabled
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  
  // Capture the current dashboard state
  const handleSaveDashboard = async () => {
    if (!userId || !currentDashboardId) return;
    
    setIsSaving(true);
    setShowModal(true);
    setStatus('pending');
    setMessage('Capturing dashboard elements...');
    
    try {
      // Prepare chart data
      const chartData = charts.map(chart => ({
        id: chart.id,
        title: chart.title,
        description: chart.description,
        graphUrl: chart.graphUrl
      }));
      
      // Send request to backend
      const response = await fetch(`http://localhost:5000/save-dashboard/${userId}/${currentDashboardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboard_name: currentDashboardName,
          charts: chartData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setResults(data.results);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSaveDashboard}
        disabled={disabled || !currentDashboardId || isSaving}
        className="flex items-center gap-1 mr-2"
      >
        {isSaving ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      
      {/* Status Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {status === 'pending' ? 'Saving Dashboard...' : 
               status === 'success' ? 'Dashboard Saved' : 'Error Saving Dashboard'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {status === 'pending' && (
              <div className="flex items-center justify-center space-x-3 my-8">
                <Loader className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
            
            {status === 'success' && (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium">{message}</p>
                </div>
                
                {results && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <p><span className="font-medium">Successfully saved:</span> {results.success} charts</p>
                    {results.failed > 0 && (
                      <p><span className="font-medium">Failed:</span> {results.failed} charts</p>
                    )}
                  </div>
                )}
                
                <p className="text-sm mt-4 text-gray-600">
                  The dashboard has been captured and will be available for export.
                </p>
              </>
            )}
            
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowModal(false)}
              variant={status === 'error' ? 'destructive' : 'default'}
            >
              {status === 'pending' ? 'Please wait...' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaveDashboardButton;