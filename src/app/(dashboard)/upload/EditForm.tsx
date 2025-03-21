import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  Hash, 
  ListFilter, 
  Calendar,
  Clock,
  AlignJustify,
  Check,
  List,
  Timer,
  X,
  ArrowRight,
  BarChart,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

// Define all possible data types
type DataType = 
  | 'Integer' 
  | 'Float' 
  | 'Character' 
  | 'String' 
  | 'Boolean' 
  | 'Array' 
  | 'Date' 
  | 'Time' 
  | 'DateTime' 
  | 'Timestamp';

type StatType = 'mean' | 'median' | 'mode' | 'mostCommon' | 'earliest' | 'latest';

// Helper function to detect if a string is a valid date
const isValidDate = (d: any): boolean => {
  if (Object.prototype.toString.call(d) === "[object Date]") {
    return !isNaN(d.getTime());
  }
  return false;
};

// Helper function to detect if a string is a valid time
const isValidTime = (timeStr: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(timeStr);
};

// Enhanced data type detection
const getDataType = (value: any): DataType => {
  // Handle null/undefined cases
  if (value === null || value === undefined) {
    return 'String';
  }

  // Check for arrays first
  if (Array.isArray(value)) {
    return 'Array';
  }

  // Check for boolean values
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    return 'Boolean';
  }

  // Handle different types of date/time values
  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    const seconds = value.getSeconds();
    
    if (hours === 0 && minutes === 0 && seconds === 0) {
      return 'Date';
    }
    return 'DateTime';
  }

  // Check for timestamp (Unix timestamp)
  if (typeof value === 'number' && value > 1000000000000) {
    return 'Timestamp';
  }

  // Check string representations
  if (typeof value === 'string') {
    // Check for time format
    if (isValidTime(value)) {
      return 'Time';
    }

    // Check for ISO date format
    if (isValidDate(new Date(value))) {
      if (value.includes('T')) {
        return 'DateTime';
      }
      return 'Date';
    }

    // Check for single character
    if (value.length === 1) {
      return 'Character';
    }

    return 'String';
  }

  // Handle numeric types
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Integer' : 'Float';
  }

  return 'String';
};

// Function to get appropriate icon for data type
const getTypeIcon = (type: DataType): React.ReactNode => {
  switch (type) {
    case 'Integer':
    case 'Float':
      return <Calculator className="h-4 w-4" />;
    case 'Boolean':
      return <Check className="h-4 w-4" />;
    case 'Array':
      return <List className="h-4 w-4" />;
    case 'Date':
      return <Calendar className="h-4 w-4" />;
    case 'Time':
      return <Clock className="h-4 w-4" />;
    case 'DateTime':
    case 'Timestamp':
      return <Timer className="h-4 w-4" />;
    case 'Character':
    case 'String':
      return <AlignJustify className="h-4 w-4" />;
    default:
      return <Hash className="h-4 w-4" />;
  }
};

// Enhanced statistics calculation for different data types
const calculateFieldStats = (values: any[], dataType: DataType) => {
  const cleanValues = values.filter(v => v !== null && v !== undefined);
  
  switch (dataType) {
    case 'Integer':
    case 'Float': {
      const numbers = cleanValues.map(Number);
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;
      const sorted = [...numbers].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      // Calculate mode
      const frequency: { [key: number]: number } = {};
      numbers.forEach(num => { frequency[num] = (frequency[num] || 0) + 1 });
      const mode = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])[0][0];

      return {
        type: dataType,
        stats: { mean, median, mode: Number(mode) }
      };
    }

    case 'Character':
    case 'String': {
      // Get frequency distribution
      const frequency: { [key: string]: number } = {};
      cleanValues.forEach(val => { frequency[val] = (frequency[val] || 0) + 1 });
      
      // Get top 3 most frequent values
      const mostFrequent = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([value, count]) => ({ value, count }));

      return {
        type: dataType,
        stats: { mostFrequent }
      };
    }

    case 'Boolean': {
      const trueCount = cleanValues.filter(v => v === true || v === 'true').length;
      const falseCount = cleanValues.filter(v => v === false || v === 'false').length;
      
      return {
        type: dataType,
        stats: {
          truePercentage: (trueCount / cleanValues.length) * 100,
          falsePercentage: (falseCount / cleanValues.length) * 100,
          mostCommon: trueCount >= falseCount ? true : false
        }
      };
    }

    case 'Date':
    case 'DateTime':
    case 'Timestamp': {
      const dates = cleanValues.map(v => new Date(v));
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
      
      return {
        type: dataType,
        stats: {
          earliest: sortedDates[0],
          latest: sortedDates[sortedDates.length - 1],
          mostFrequent: calculateFrequentDates(dates)
        }
      };
    }

    case 'Time': {
      const timeStrings = cleanValues.map(String);
      const frequency: { [key: string]: number } = {};
      timeStrings.forEach(time => { frequency[time] = (frequency[time] || 0) + 1 });
      
      const mostFrequent = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([value, count]) => ({ value, count }));

      return {
        type: dataType,
        stats: { mostFrequent }
      };
    }

    case 'Array': {
      const lengths = cleanValues.map(arr => arr.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      
      return {
        type: dataType,
        stats: {
          averageLength: avgLength,
          minLength: Math.min(...lengths),
          maxLength: Math.max(...lengths)
        }
      };
    }

    default:
      return { type: dataType, stats: {} };
  }
};

// Helper function to calculate frequent dates
const calculateFrequentDates = (dates: Date[]) => {
  const frequency: { [key: string]: number } = {};
  dates.forEach(date => {
    const key = date.toISOString();
    frequency[key] = (frequency[key] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([date, count]) => ({
      date: new Date(date),
      count
    }));
};

// Format value based on its data type
const formatValue = (value: any, type: DataType): string => {
  switch (type) {
    case 'Integer':
      return Math.round(Number(value)).toString();
    case 'Float':
      return Number(value).toFixed(2);
    case 'Boolean':
      return value.toString();
    case 'Date':
      return value instanceof Date 
        ? value.toLocaleDateString() 
        : new Date(value).toLocaleDateString();
    case 'Time':
      return value instanceof Date 
        ? value.toLocaleTimeString() 
        : new Date(value).toLocaleTimeString();
    case 'DateTime':
    case 'Timestamp':
      return value instanceof Date 
        ? value.toLocaleString() 
        : new Date(value).toLocaleString();
    default:
      return String(value);
  }
};

interface EnhancedEditFormProps {
  data: any[];
  activeRow: any;
  setActiveRow: (row: any) => void;
  columnOrder: Record<string, number>;
  loading?: boolean;
}

const EnhancedEditForm: React.FC<EnhancedEditFormProps> = ({
  data,
  activeRow,
  setActiveRow,
  columnOrder,
  loading = false,
}) => {
  const [fieldStats, setFieldStats] = useState<Record<string, any>>({});
  // Track which field's statistics are currently being shown
  const [activeStatField, setActiveStatField] = useState<string | null>(null);
  // State for bulk update dialog
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkStatType, setBulkStatType] = useState<StatType>('mean');
  const [updatedFieldsCount, setUpdatedFieldsCount] = useState<number>(0);

  useEffect(() => {
    // Calculate statistics for each field
    if (data && data.length > 0) {
      const stats: Record<string, any> = {};
      Object.keys(data[0]).forEach(field => {
        if (field === 'id' || field === 'rowId') return; // Skip these fields
        
        const values = data.map(row => row[field]);
        const sampleValue = values.find(v => v !== null && v !== undefined);
        const dataType = getDataType(sampleValue);
        stats[field] = calculateFieldStats(values, dataType);
      });
      setFieldStats(stats);
    }
  }, [data]);

  if (!activeRow?.data) return null;

  const handleValueSelect = (field: string, value: any) => {
    setActiveRow({
      ...activeRow,
      data: {
        ...activeRow.data,
        [field]: value
      }
    });
    
    // Close stats after selection
    setActiveStatField(null);
  };
  
  // Toggle showing statistics for a field
  const toggleFieldStats = (field: string) => {
    setActiveStatField(activeStatField === field ? null : field);
  };

  // Apply bulk update to all columns based on their statistical value type
  const applyBulkUpdate = () => {
    const updatedData = { ...activeRow.data };
    let updateCount = 0;
    
    Object.entries(fieldStats).forEach(([field, stats]) => {
      // Skip non-data fields
      if (field === 'id' || field === 'rowId') return;
      
      const type = stats.type;
      const fieldStats = stats.stats;
      
      // Skip fields that don't have appropriate stats
      if (!fieldStats) return;
      
      // Apply the selected statistic based on data type
      switch (type) {
        case 'Integer':
        case 'Float':
          // For numeric fields, apply mean, median, or mode
          if (bulkStatType === 'mean' && fieldStats.mean !== undefined) {
            updatedData[field] = fieldStats.mean;
            updateCount++;
          } else if (bulkStatType === 'median' && fieldStats.median !== undefined) {
            updatedData[field] = fieldStats.median;
            updateCount++;
          } else if ((bulkStatType === 'mode' || bulkStatType === 'mostCommon') && fieldStats.mode !== undefined) {
            updatedData[field] = fieldStats.mode;
            updateCount++;
          }
          break;
          
        case 'Boolean':
          // For boolean fields, apply most common value
          if (bulkStatType === 'mostCommon' || bulkStatType === 'mode') {
            updatedData[field] = fieldStats.mostCommon;
            updateCount++;
          }
          break;
          
        case 'Date':
        case 'DateTime':
        case 'Timestamp':
          // For date fields, apply earliest or latest date
          if (bulkStatType === 'earliest' && fieldStats.earliest) {
            updatedData[field] = fieldStats.earliest;
            updateCount++;
          } else if (bulkStatType === 'latest' && fieldStats.latest) {
            updatedData[field] = fieldStats.latest;
            updateCount++;
          } else if (bulkStatType === 'mostCommon' && fieldStats.mostFrequent && fieldStats.mostFrequent.length > 0) {
            // If most common is selected for dates, use the most frequent date
            updatedData[field] = fieldStats.mostFrequent[0].date;
            updateCount++;
          }
          break;
          
        case 'Time':
          // For time fields, apply most common time
          if (bulkStatType === 'mostCommon' && fieldStats.mostFrequent && fieldStats.mostFrequent.length > 0) {
            updatedData[field] = fieldStats.mostFrequent[0].value;
            updateCount++;
          }
          break;
          
        case 'String':
        case 'Character':
          // For string fields, apply most common value
          if ((bulkStatType === 'mostCommon' || bulkStatType === 'mode') && 
              fieldStats.mostFrequent && fieldStats.mostFrequent.length > 0) {
            updatedData[field] = fieldStats.mostFrequent[0].value;
            updateCount++;
          }
          break;
          
        // For arrays, we don't apply bulk updates as it's not typically meaningful
        case 'Array':
        default:
          // No applicable statistical value for this field type and selected statistic
          break;
      }
    });
    
    // Update the form with the new values
    setActiveRow({
      ...activeRow,
      data: updatedData
    });
    
    // Store updated fields count for toast message
    setUpdatedFieldsCount(updateCount);
    
    // Close the dialog
    setIsBulkDialogOpen(false);
    
    // Show a toast notification about the update
    toast({
      title: "Bulk Update Applied",
      description: `Updated ${updateCount} field${updateCount !== 1 ? 's' : ''} with ${bulkStatType} values`,
    });
  };

  // Function to render the compact statistics UI for a field
  const renderCompactStatsUI = (field: string, stats: any) => {
    const type = stats.type;
    const fieldStats = stats.stats;

    return (
      <div className="py-1">
        {type === 'Integer' || type === 'Float' ? (
          <div className="grid grid-cols-3 gap-1 mb-1">
            <button
              className="px-2 py-1 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100 text-center"
              onClick={() => handleValueSelect(field, fieldStats.mean)}
            >
              <div className="text-xs text-green-800 mb-0.5">Mean</div>
              <div className="font-mono">{formatValue(fieldStats.mean, type)}</div>
            </button>
            <button
              className="px-2 py-1 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100 text-center"
              onClick={() => handleValueSelect(field, fieldStats.median)}
            >
              <div className="text-xs text-green-800 mb-0.5">Median</div>
              <div className="font-mono">{formatValue(fieldStats.median, type)}</div>
            </button>
            <button
              className="px-2 py-1 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100 text-center"
              onClick={() => handleValueSelect(field, fieldStats.mode)}
            >
              <div className="text-xs text-green-800 mb-0.5">Mode</div>
              <div className="font-mono">{formatValue(fieldStats.mode, type)}</div>
            </button>
          </div>
        ) : type === 'Boolean' ? (
          <button
            className="w-full px-2 py-1 text-xs flex justify-between items-center bg-green-50 border border-green-200 rounded hover:bg-green-100"
            onClick={() => handleValueSelect(field, fieldStats.mostCommon)}
          >
            <span className="text-green-800">Most Common:</span>
            <Badge className="bg-green-600 text-white ml-1">
              {fieldStats.mostCommon.toString()}
            </Badge>
          </button>
        ) : type === 'Date' || type === 'DateTime' || type === 'Timestamp' ? (
          <div className="space-y-1">
            {fieldStats.earliest && (
              <div className="grid grid-cols-2 gap-1">
                <button
                  className="px-2 py-1 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100"
                  onClick={() => handleValueSelect(field, fieldStats.earliest)}
                >
                  <span className="text-green-800 block mb-0.5">Earliest</span>
                  <span className="font-mono text-xs truncate block">
                    {formatValue(fieldStats.earliest, type)}
                  </span>
                </button>
                <button
                  className="px-2 py-1 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100"
                  onClick={() => handleValueSelect(field, fieldStats.latest)}
                >
                  <span className="text-green-800 block mb-0.5">Latest</span>
                  <span className="font-mono text-xs truncate block">
                    {formatValue(fieldStats.latest, type)}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : type === 'String' || type === 'Character' ? (
          <div>
            {fieldStats.mostFrequent && fieldStats.mostFrequent.length > 0 ? (
              <div className="grid grid-cols-1 gap-1">
                {fieldStats.mostFrequent.slice(0, 2).map((item: any, index: number) => (
                  <button
                    key={index}
                    className="w-full px-2 py-1 text-xs text-left bg-green-50 border border-green-200 rounded hover:bg-green-100 flex justify-between items-center"
                    onClick={() => handleValueSelect(field, item.value)}
                  >
                    <span className="truncate max-w-[140px] text-green-800">{item.value}</span>
                    <Badge variant="outline" className="ml-1 text-xs">
                      {item.count}×
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 p-1">No common values</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 p-1">No applicable stats</div>
        )}
      </div>
    );
  };

  const sortedFields = Object.entries(activeRow.data)
    .filter(([key]) => key !== 'id' && key !== 'rowId')
    .sort(([keyA], [keyB]) => {
      const orderA = columnOrder[keyA] ?? Infinity;
      const orderB = columnOrder[keyB] ?? Infinity;
      return orderA - orderB;
    });

  // Get the appropriate input type based on data type
  const getInputType = (dataType: DataType) => {
    switch (dataType) {
      case 'Integer':
      case 'Float':
        return 'number';
      case 'Date':
        return 'date';
      case 'Time':
        return 'time';
      case 'DateTime':
        return 'datetime-local';
      case 'Boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  };

  // Input step value based on data type
  const getInputStep = (dataType: DataType) => {
    switch (dataType) {
      case 'Integer':
        return '1';
      case 'Float':
        return '0.01';
      case 'Time':
        return '1';  // Step in seconds
      default:
        return undefined;
    }
  };

  // Custom input styling based on data type
  const getInputStyle = (dataType: DataType) => {
    const baseStyle = "flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
    switch (dataType) {
      case 'Integer':
      case 'Float':
        return `${baseStyle} text-right font-mono`;
      case 'Boolean':
        return `${baseStyle} h-6 w-6`;
      case 'Array':
        return `${baseStyle} font-mono`;
      case 'Date':
      case 'Time':
      case 'DateTime':
      case 'Timestamp':
        return `${baseStyle} font-mono`;
      default:
        return baseStyle;
    }
  };

  // Format the display value based on data type
  const getDisplayValue = (value: any, dataType: DataType) => {
    if (value === null || value === undefined) return '';
    
    switch (dataType) {
      case 'Array':
        return Array.isArray(value) ? JSON.stringify(value) : value;
      case 'DateTime':
      case 'Timestamp':
        return value instanceof Date ? value.toISOString().slice(0, 16) : value;
      case 'Date':
        return value instanceof Date ? value.toISOString().slice(0, 10) : value;
      case 'Time':
        return value instanceof Date ? value.toTimeString().slice(0, 8) : value;
      default:
        return value;
    }
  };

  // Get explanatory text for the selected bulk update type
  const getBulkUpdateDescription = (statType: StatType) => {
    switch (statType) {
      case 'mean':
        return "Will set numeric fields to their average value";
      case 'median':
        return "Will set numeric fields to their middle value";
      case 'mode':
        return "Will set numeric fields to their most frequent value";
      case 'mostCommon':
        return "Will set all fields to their most frequently occurring value";
      case 'earliest':
        return "Will set date fields to their earliest date";
      case 'latest':
        return "Will set date fields to their latest date";
      default:
        return "Will apply statistical values to compatible fields";
    }
  };

  return (
    <div className="py-4">
      {/* Bulk Update Button */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setIsBulkDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <BarChart className="h-4 w-4 mr-1" />
          Bulk Update with Statistics
        </Button>
      </div>
      
      <div className="grid gap-4">
        {sortedFields.map(([field, value]) => {
          const stats = fieldStats[field];
          const dataType = stats?.type || 'String';
          const isStatsActive = activeStatField === field;
          
          return (
            <div key={field}>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right space-y-1">
                  <Label htmlFor={field} className="text-gray-700">
                    {field}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-help"
                        >
                          {dataType}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center">
                        <div className="text-sm">
                          <p className="font-semibold">{dataType}</p>
                          {stats?.stats && (
                            <p className="text-xs text-gray-400 mt-1">
                              Click calculator icon for statistics
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="col-span-3 space-y-1">
                  <div className="flex gap-2">
                    {dataType === 'Boolean' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={field}
                          checked={value === true || value === 'true'}
                          onChange={(e) => handleValueSelect(field, e.target.checked)}
                          className={getInputStyle('Boolean')}
                          disabled={loading}
                        />
                        <Label htmlFor={field} className="text-sm text-gray-600">
                          {value === true || value === 'true' ? 'True' : 'False'}
                        </Label>
                      </div>
                    ) : dataType === 'Array' ? (
                      <div className="flex-1">
                        <Input
                          id={field}
                          value={getDisplayValue(value, dataType)}
                          onChange={(e) => {
                            try {
                              const parsedValue = JSON.parse(e.target.value);
                              handleValueSelect(field, parsedValue);
                            } catch {
                              handleValueSelect(field, e.target.value);
                            }
                          }}
                          className={getInputStyle('Array')}
                          placeholder="[ ]"
                          disabled={loading}
                        />
                        
                      </div>
                    ) : (
                      <Input
                        id={field}
                        type={getInputType(dataType as DataType)}
                        value={getDisplayValue(value, dataType as DataType)}
                        onChange={(e) => handleValueSelect(field, e.target.value)}
                        className={getInputStyle(dataType as DataType)}
                        disabled={loading}
                        step={getInputStep(dataType as DataType)}
                        min={dataType === 'Integer' || dataType === 'Float' ? '0' : undefined}
                      />
                    )}

                    {stats && (
                      <Button 
                        variant={isStatsActive ? "secondary" : "outline"}
                        size="icon"
                        className={`shrink-0 transition-colors ${isStatsActive ? 'bg-green-100 text-green-800 border-green-300' : 'hover:bg-green-50 hover:text-green-700'}`}
                        disabled={loading}
                        onClick={() => toggleFieldStats(field)}
                        title="Show statistical values"
                      >
                        {getTypeIcon(dataType as DataType)}
                      </Button>
                    )}
                  </div>
                  
                  {dataType === 'Array' && !isStatsActive && (
                    <p className="text-xs text-gray-500">
                      Enter valid JSON array format: [item1, item2, ...]
                    </p>
                  )}
                </div>
              </div>
            {/* Render statistics UI when this field is active */}
             {/* Render compact statistics UI when this field is active */}
             {isStatsActive && stats && (
                <Card className="mt-1 mb-2 border-green-200 shadow-sm ml-[25%] w-[75%]">
                  <CardContent className="pt-2 pb-2 px-3">
                    <div className="flex justify-between items-center border-b border-green-100 pb-1 mb-1">
                      <h4 className="text-xs font-medium text-green-800">Statistical values for {field}</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-800 hover:bg-green-50"
                        onClick={() => toggleFieldStats(field)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {renderCompactStatsUI(field, stats)}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk Update Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Fields</DialogTitle>
            <DialogDescription>
              {getBulkUpdateDescription(bulkStatType)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={bulkStatType}
              onValueChange={(value) => setBulkStatType(value as StatType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a statistical value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mean">Mean</SelectItem>
                <SelectItem value="median">Median</SelectItem>
                <SelectItem value="mode">Mode</SelectItem>
                <SelectItem value="mostCommon">Most Common</SelectItem>
                <SelectItem value="earliest">Earliest</SelectItem>
                <SelectItem value="latest">Latest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={applyBulkUpdate}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedEditForm;