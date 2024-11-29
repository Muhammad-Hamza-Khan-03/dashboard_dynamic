import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ChartConfig {
    id: number;
    type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'composed' | 'radar';
    data: Record<string, any>[];
    columns: {
      x: string;
      y: string;
    };
  }
  
interface Dashboard {
  id: string;
  name: string;
  charts: ChartConfig[];
}

interface DashboardGridProps {
  charts: ChartConfig[];
  dashboards: Dashboard[];
  currentDashboard: string;
  setCurrentDashboard: (id: string) => void;
  renderChart: (chart: ChartConfig) => JSX.Element;
  onAddDashboard: (name: string) => void;
  onAddChartToDashboard: (dashboardId: string, chartId: number) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  charts,
  dashboards,
  currentDashboard,
  setCurrentDashboard,
  renderChart,
  onAddDashboard,
  onAddChartToDashboard
}) => {
  const [showNewDashboardDialog, setShowNewDashboardDialog] = React.useState(false);
  const [newDashboardName, setNewDashboardName] = React.useState('');

  const handleCreateDashboard = () => {
    if (newDashboardName.trim()) {
      onAddDashboard(newDashboardName);
      setNewDashboardName('');
      setShowNewDashboardDialog(false);
    }
  };

  return (
    <Tabs value={currentDashboard} onValueChange={setCurrentDashboard} className="w-full">
      <div className="flex justify-between items-center border-b">
        <TabsList>
          {dashboards.map((dashboard) => (
            <TabsTrigger key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Dialog open={showNewDashboardDialog} onOpenChange={setShowNewDashboardDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mr-2">
              <Plus className="h-4 w-4 mr-1" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Dashboard name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
              />
              <Button onClick={handleCreateDashboard}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dashboards.map((dashboard) => (
        <TabsContent key={dashboard.id} value={dashboard.id}>
          <div className="grid grid-cols-2 gap-4 p-4">
            {dashboard.charts.map((chart) => renderChart(chart))}
            {charts.length > 0 && (
              <Card className="p-4 flex items-center justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => onAddChartToDashboard(dashboard.id, charts[0].id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Chart
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};