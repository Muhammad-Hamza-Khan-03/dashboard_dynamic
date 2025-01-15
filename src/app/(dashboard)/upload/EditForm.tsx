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
  Timer
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
      return new Date(value).toLocaleDateString();
    case 'Time':
      return new Date(value).toLocaleTimeString();
    case 'DateTime':
    case 'Timestamp':
      return new Date(value).toLocaleString();
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

  useEffect(() => {
    // Calculate statistics for each field
    if (data && data.length > 0) {
      const stats: Record<string, any> = {};
      Object.keys(data[0]).forEach(field => {
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
  };

  // Render statistics popover content based on data type
  const renderStatisticsPopover = (field: string, stats: any) => {
    const type = stats.type;
    const fieldStats = stats.stats;

    switch (type) {
      case 'Integer':
      case 'Float':
        return (
          <PopoverContent className="w-72 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Statistical Values</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(fieldStats).map(([key, value]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className="justify-between"
                    onClick={() => handleValueSelect(field, value)}
                  >
                    <span className="capitalize">{key}</span>
                    <Badge variant="secondary">{formatValue(value, type)}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        );

      case 'Boolean':
        return (
          <PopoverContent className="w-72 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Distribution</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-between"
                  onClick={() => handleValueSelect(field, fieldStats.mostCommon)}
                >
                  <span>Most Common</span>
                  <Badge variant="secondary">
                    {fieldStats.mostCommon.toString()}
                  </Badge>
                </Button>
                <div className="text-sm text-gray-500">
                  True: {fieldStats.truePercentage.toFixed(1)}%
                  <br />
                  False: {fieldStats.falsePercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </PopoverContent>
        );

      case 'Date':
      case 'DateTime':
      case 'Timestamp':
        return (
          <PopoverContent className="w-72 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Date Range</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-between"
                  onClick={() => handleValueSelect(field, fieldStats.earliest)}
                >
                  <span>Earliest</span>
                  <Badge variant="secondary">
                    {formatValue(fieldStats.earliest, type)}
                  </Badge>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-between"
                  onClick={() => handleValueSelect(field, fieldStats.latest)}
                >
                  <span>Latest</span>
                  <Badge variant="secondary">
                    {formatValue(fieldStats.latest, type)}
                  </Badge>
                </Button>
              </div>
            </div>
          </PopoverContent>
        );

      default:
        return (
          <PopoverContent className="w-72 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Most Frequent Values</h4>
              <div className="grid grid-cols-1 gap-2">
                {fieldStats.mostFrequent?.map((item: any, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="justify-between"
                    onClick={() => handleValueSelect(field, item.value)}
                  >
                    <span>#{index + 1} Most Common</span>
                    <Badge variant="secondary">{item.value}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        );
    }
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

  return (
    <div className="grid gap-4 py-4">
      {sortedFields.map(([field, value]) => {
        const stats = fieldStats[field];
        const dataType = stats?.type || 'String';
        
        return (
          <div key={field} className="grid grid-cols-4 items-center gap-4">
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
                          Click icon for statistics
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="col-span-3 space-y-2">
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
                    {value && !Array.isArray(value) && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Invalid array format
                      </p>
                    )}
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="shrink-0"
                        disabled={loading}
                      >
                        {getTypeIcon(dataType as DataType)}
                      </Button>
                    </PopoverTrigger>
                    {renderStatisticsPopover(field, stats)}
                  </Popover>
                )}
              </div>

              {/* Field-specific guidance */}
              {value === '' && (
                <p className="text-xs text-gray-500">
                  Click the {getTypeIcon(dataType as DataType)} icon to see suggested values
                </p>
              )}
              
              {dataType === 'Array' && (
                <p className="text-xs text-gray-500">
                  Enter valid JSON array format: [item1, item2, ...]
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnhancedEditForm;