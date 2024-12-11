import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardChart {
  id: string;
  type: string;
  title: string;
  graphUrl: string;
}

interface DashboardComponentProps {
  charts: DashboardChart[];
  onRemoveChart: (chartId: string) => void;
}

const DashboardComponent: React.FC<DashboardComponentProps> = ({ charts, onRemoveChart }) => {
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);
  const [positions, setPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [sizes, setSizes] = useState<{ [key: string]: { width: number; height: number } }>({});

  const handleDrag = (id: string, newPosition: { x: number; y: number }) => {
    setPositions(prev => ({
      ...prev,
      [id]: newPosition
    }));
  };

  const toggleMaximize = (id: string) => {
    setMaximizedChart(maximizedChart === id ? null : id);
  };

  const getChartPosition = (id: string) => {
    return positions[id] || { x: 0, y: 0 };
  };

  const getChartSize = (id: string) => {
    return sizes[id] || { width: 400, height: 300 };
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-gray-50 p-4">
      {charts.map(chart => (
        <motion.div
          key={chart.id}
          drag={maximizedChart !== chart.id}
          dragMomentum={false}
          initial={getChartPosition(chart.id)}
          animate={maximizedChart === chart.id ? {
            x: 0,
            y: 0,
            width: '100%',
            height: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 50
          } : {
            x: getChartPosition(chart.id).x,
            y: getChartPosition(chart.id).y,
            width: getChartSize(chart.id).width,
            height: getChartSize(chart.id).height,
            position: 'absolute'
          }}
          onDragEnd={(_, info) => handleDrag(chart.id, { x: info.offset.x, y: info.offset.y })}
          className={`${maximizedChart === chart.id ? 'fixed inset-0 bg-white' : 'absolute'}`}
        >
          <Card className="w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{chart.title}</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleMaximize(chart.id)}
                >
                  {maximizedChart === chart.id ? 
                    <Minimize2 className="h-4 w-4" /> : 
                    <Maximize2 className="h-4 w-4" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveChart(chart.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
            <iframe
  src={chart.graphUrl}
  className="w-full h-full border-0"
  style={{ height: maximizedChart === chart.id ? 'calc(100vh - 60px)' : `${getChartSize(chart.id).height - 60}px` }}
  onLoad={() => console.log('iframe loaded:', chart.graphUrl)}
  onError={(e) => console.error('iframe error:', e)}
/>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardComponent;