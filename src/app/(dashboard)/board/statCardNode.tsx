import React from 'react';
import { NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { useTheme } from './theme-provider';

interface StatCardNodeData {
  id: string;
  column: string;
  data: any[];
  statType: 'count' | 'sum' | 'mean' | 'mode' | 'max' | 'min';
  title?: string;
  onRemove: (id: string) => void;
}

const StatCardNode: React.FC<NodeProps<StatCardNodeData>> = ({ data }) => {
  const { theme } = useTheme();

  const calculateStat = () => {
    const values = data.data.map(row => row[data.column]);
    
    switch (data.statType) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((acc, val) => acc + (Number(val) || 0), 0);
      case 'mean':
        return values.reduce((acc, val) => acc + (Number(val) || 0), 0) / values.length;
      case 'mode':
        return values.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      case 'max':
        return Math.max(...values.map(v => Number(v) || 0));
      case 'min':
        return Math.min(...values.map(v => Number(v) || 0));
      default:
        return 'N/A';
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });
    }
    return value;
  };

  const getStatTitle = () => {
    switch (data.statType) {
      case 'count':
        return 'Total Count';
      case 'sum':
        return 'Sum';
      case 'mean':
        return 'Average';
      case 'mode':
        return 'Mode';
      case 'max':
        return 'Maximum';
      case 'min':
        return 'Minimum';
      default:
        return 'Statistic';
    }
  };

  return (
    <Card 
      className="w-[300px] shadow-lg" 
      style={{ 
        backgroundColor: theme.nodeBackground,
        color: theme.text,
        borderColor: theme.border
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          {data.title || `${getStatTitle()} - ${data.column}`}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-opacity-10"
          onClick={() => data.onRemove(data.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" style={{ color: theme.primary }}>
          {formatValue(calculateStat())}
        </div>
        <p className="mt-2 text-sm" style={{ color: theme.secondary }}>
          Based on {data.data.length} records
        </p>
      </CardContent>
    </Card>
  );
};

export default StatCardNode;