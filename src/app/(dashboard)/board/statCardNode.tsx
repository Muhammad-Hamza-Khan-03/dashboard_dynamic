import React, { useCallback } from 'react';
import { NodeProps, XYPosition } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { useTheme } from './theme-provider';

type StatType = 'count' | 'sum' | 'mean' | 'mode' | 'max' | 'min';

interface StatCardNodeDataProps {
  column: string;
  data: Record<string, any>[];
  statType: StatType;
  title?: string;
  onRemove: (id: string) => void;
}

interface StatCardNodeType extends Node {
  id: string;
  data: Record<string, any>;
  position: XYPosition;
}

const StatCardNode: React.FC<NodeProps<StatCardNodeType>> = ({ id, data, selected }) => {
  const { boardTheme: theme } = useTheme();

  // Calculate the statistic based on the selected stat type
  const calculateStat = useCallback(() => {
    if (!data.data || !data.data.length) return 'No data';
    
    const values = data.data
      .map((row: { [x: string]: any; }) => row[data.column])
      .filter((val: null | undefined) => val !== undefined && val !== null);
    
    if (values.length === 0) return 'No valid data';
    
    switch (data.statType) {
      case 'count':
        return values.length;
        
      case 'sum':
        // Ensure we're handling numeric values for sum
        return values.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        
      case 'mean':
        // Calculate average
        const sum = values.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        return sum / values.length;
        
      case 'mode': {
        // Find the most common value
        const valueCounts: Record<string, number> = {};
        
        // Count occurrences of each value
        values.forEach((val: any) => {
          const key = String(val);
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        });
        
        let maxCount = 0;
        let modeValue: string | null = null;
        
        // Find the value with the highest count
        Object.entries(valueCounts).forEach(([value, count]) => {
          if (count > maxCount) {
            maxCount = count;
            modeValue = value;
          }
        });
        
        return modeValue;
      }
      
      case 'max':
        // Handle numeric and non-numeric values differently
        if (typeof values[0] === 'number') {
          return Math.max(...values.map((v: any) => Number(v) || 0));
        } else {
          // For string values, return the alphabetically last value
          return [...values].sort().pop();
        }
        
      case 'min':
        // Handle numeric and non-numeric values differently
        if (typeof values[0] === 'number') {
          return Math.min(...values.map((v: any) => Number(v) || 0));
        } else {
          // For string values, return the alphabetically first value
          return [...values].sort()[0];
        }
        
      default:
        return 'N/A';
    }
  }, [data.data, data.column, data.statType]);

  // Format the calculated value for display
  const formatValue = useCallback((value: any) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'number') {
      // Format numbers with appropriate precision
      if (value % 1 === 0) {
        // Integer - use regular formatting
        return value.toLocaleString();
      } else {
        // Float - limit to 2 decimal places
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      }
    }
    
    // Return string values as is
    return value;
  }, []);

  // Get the title for the stat type
  const getStatTitle = useCallback(() => {
    switch (data.statType) {
      case 'count': return 'Total Count';
      case 'sum': return 'Sum';
      case 'mean': return 'Average';
      case 'mode': return 'Most Common';
      case 'max': return 'Maximum';
      case 'min': return 'Minimum';
      default: return 'Statistic';
    }
  }, [data.statType]);

  // Handle remove button click
  const handleRemove = useCallback(() => {
    data.onRemove(data.id);
  }, [data]);

  return (
    <Card 
      className="shadow-lg transition-colors duration-200" 
      style={{ 
        backgroundColor: theme.nodeBackground,
        color: theme.text,
        borderColor: theme.border,
        width: '100%',
        height: '100%'
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
        <CardTitle className="text-lg font-semibold">
          {data.title || `${getStatTitle()} - ${data.column}`}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-opacity-10"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div 
          className="text-3xl font-bold my-4" 
          style={{ color: theme.primary }}
        >
          {formatValue(calculateStat())}
        </div>
        <p 
          className="mt-2 text-sm" 
          style={{ color: theme.secondary }}
        >
          Based on {data.data?.length || 0} records
        </p>
      </CardContent>
    </Card>
  );
};

export default StatCardNode;