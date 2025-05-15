import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Check, Loader } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from '@/components/ui/use-toast';

interface SaveDashboardButtonProps {
  userId: string | undefined;
  currentDashboardId: string | null;
  currentDashboardName: string;
  charts: any[];
  statCards: any[];
  dataTables: any[];
  textBoxes?: any[];
  disabled?: boolean;
}

/**
 * A button that captures the current state of all dashboard elements
 * and stores them in the database for later export.
 */
const SaveDashboardButton: React.FC<SaveDashboardButtonProps> = ({
  userId,
  currentDashboardId,
  currentDashboardName,
  charts,
  statCards,
  dataTables,
  textBoxes = [],
  disabled
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  
  // This function correctly calculates stat values based on stat type
  function calculateStatValue(card: { data: any[]; column: string; statType: string; }) {
    const data = card.data || [];
    const column = card.column;
    const statType = card.statType;
    
    if (!data.length || !column) return "N/A";
    
    try {
      // Extract values from the data
      const values = data.map(item => item[column])
        .filter(val => val !== null && val !== undefined)
        .map(val => typeof val === 'string' ? parseFloat(val) : val)
        .filter(val => !isNaN(val)); // Filter out NaN values
      
      if (!values.length) return "N/A";
      
      switch (statType) {
        case 'count':
          return values.length.toString();
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
      
      // Calculate actual stat values for each card
      const statCardData = statCards.map(card => ({
        id: card.id,
        title: card.title,
        value: calculateStatValue(card), // Using the correct calculation function
        statType: card.statType,
        column: card.column
      }));

      // Prepare data table data
      const dataTableData = dataTables.map(table => ({
        id: table.id,
        title: table.title,
        columns: table.columns,
        data: table.data
      }));
      
      // First save the visualization data for rendering
      const saveVisResponse = await fetch(`http://localhost:5000/save-dashboard/${userId}/${currentDashboardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboard_name: currentDashboardName,
          charts: chartData,
          stat_cards: statCardData,
          data_tables: dataTableData 
        }),
      });  
      
      if (!saveVisResponse.ok) {
        throw new Error(`Failed to save visualizations: ${saveVisResponse.status}`);
      }
      
      // Then save the complete dashboard structure with all elements
      const saveCompleteResponse = await fetch(`http://localhost:5000/save-complete-dashboard/${userId}/${currentDashboardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: currentDashboardName,
          charts: charts,
          textBoxes: textBoxes,
          dataTables: dataTables,
          statCards: statCards.map(card => ({
            ...card,
            calculatedValue: calculateStatValue(card) // Add calculated value to ensure it's stored
          }))
        }),
      });
      
      if (!saveCompleteResponse.ok) {
        throw new Error(`Failed to save complete dashboard: ${saveCompleteResponse.status}`);
      }
      
      const data = await saveCompleteResponse.json();
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Dashboard saved successfully');
        setResults(data.results || {
          success: charts.length + statCards.length + dataTables.length + textBoxes.length,
          failed: 0
        });
        
        // Also show a toast notification
        toast({
          title: "Dashboard saved",
          description: "Your dashboard has been saved to the database.",
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save dashboard');
      
      // Show error toast
      toast({
        title: "Failed to save dashboard",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
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
                    <p><span className="font-medium">Successfully saved:</span> {results.success} elements</p>
                    {results.failed > 0 && (
                      <p><span className="font-medium">Failed:</span> {results.failed} elements</p>
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