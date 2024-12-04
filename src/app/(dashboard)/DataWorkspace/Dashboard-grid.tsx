import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Maximize2, Plus } from "lucide-react";
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
    dashboards: Dashboard[];
    currentDashboard: string;
    setCurrentDashboard: (id: string) => void;
    onCreateChart: (dashboardId: string) => void;
    onAddDashboard: (name: string) => void;
    onShowChartModal: (chart: ChartConfig) => void;
    renderChart: (chart: ChartConfig) => JSX.Element;
  }
  
  export const DashboardGrid: React.FC<DashboardGridProps> = ({
    dashboards,
    currentDashboard,
    setCurrentDashboard,
    onCreateChart,
    onAddDashboard,
    onShowChartModal,
    renderChart
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
  
    const renderChartWithModal = (chart: ChartConfig) => (
      <Card className="p-6 relative h-[calc(50vh-60px)] min-h-[400px]" key={chart.id}>
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onShowChartModal(chart)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {renderChart(chart)}
      </Card>
    );
  
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
            <div className="grid grid-cols-2 gap-6 p-6 min-h-[calc(100vh-120px)]">
              {dashboard.charts.map(renderChartWithModal)}
              <Card className="p-6 flex items-center justify-center h-[calc(50vh-60px)] min-h-[400px]">
                <Button 
                  variant="outline" 
                  onClick={() => onCreateChart(dashboard.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Chart
                </Button>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };