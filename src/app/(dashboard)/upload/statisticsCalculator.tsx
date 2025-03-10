import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, AlertCircle, ChevronDown, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatisticsCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  userId: string;
  columns: string[];
}

type Operator = '+' | '-' | '*' | '/' | 'min' | 'max' | 'mean' | 'correlation' | 'stddev';

interface OperatorOption {
  value: Operator;
  label: string;
  description: string;
}

const operatorOptions: OperatorOption[] = [
  { value: '+', label: 'Add', description: 'Sum of two columns' },
  { value: '-', label: 'Subtract', description: 'Difference between columns' },
  { value: '*', label: 'Multiply', description: 'Product of two columns' },
  { value: '/', label: 'Divide', description: 'Division of first column by second' },
  { value: 'min', label: 'Minimum', description: 'Smallest value between columns' },
  { value: 'max', label: 'Maximum', description: 'Largest value between columns' },
  { value: 'mean', label: 'Average', description: 'Average of selected columns' },
  { value: 'correlation', label: 'Correlation', description: 'Correlation coefficient between columns' },
  { value: 'stddev', label: 'Standard Deviation', description: 'Standard deviation of columns' }
];

const StatisticsCalculator: React.FC<StatisticsCalculatorProps> = ({
  isOpen,
  onClose,
  fileId,
  userId,
  columns
}) => {
  const [firstColumn, setFirstColumn] = useState<string>('');
  const [secondColumn, setSecondColumn] = useState<string>('');
  const [operator, setOperator] = useState<Operator>('+');
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const [filteredFirstColumns, setFilteredFirstColumns] = useState<string[]>([]);
  const [filteredSecondColumns, setFilteredSecondColumns] = useState<string[]>([]);
  const [firstColumnInput, setFirstColumnInput] = useState('');
  const [secondColumnInput, setSecondColumnInput] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFirstColumn('');
      setSecondColumn('');
      setOperator('+');
      setNewColumnName('');
      setError(null);
      setResult(null);
      setFirstColumnInput('');
      setSecondColumnInput('');
      setFilteredFirstColumns(columns);
      setFilteredSecondColumns(columns);
    }
  }, [isOpen, columns]);

  // Filter columns based on input
  useEffect(() => {
    if (firstColumnInput) {
      const filtered = columns.filter(col => 
        col.toLowerCase().includes(firstColumnInput.toLowerCase())
      );
      setFilteredFirstColumns(filtered);
    } else {
      setFilteredFirstColumns(columns);
    }
  }, [firstColumnInput, columns]);

  useEffect(() => {
    if (secondColumnInput) {
      const filtered = columns.filter(col => 
        col.toLowerCase().includes(secondColumnInput.toLowerCase())
      );
      setFilteredSecondColumns(filtered);
    } else {
      setFilteredSecondColumns(columns);
    }
  }, [secondColumnInput, columns]);

  // Generate suggested column name when columns and operator change
  useEffect(() => {
    if (firstColumn && operator) {
      let suggestedName = '';
      
      const operatorSymbols: Record<Operator, string> = {
        '+': '_plus_',
        '-': '_minus_',
        '*': '_mult_',
        '/': '_div_',
        'min': '_min_',
        'max': '_max_',
        'mean': '_avg_',
        'correlation': '_corr_',
        'stddev': '_stddev_'
      };
      
      if (secondColumn) {
        // Both columns selected
        suggestedName = `${firstColumn}${operatorSymbols[operator]}${secondColumn}`;
      } else {
        // Only first column selected (for single column operations)
        suggestedName = `${firstColumn}${operatorSymbols[operator]}`;
      }
      
      setNewColumnName(suggestedName);
    }
  }, [firstColumn, secondColumn, operator]);

  const handleCalculate = async () => {
    if (!firstColumn) {
      setError('First column is required');
      return;
    }

    if (!newColumnName.trim()) {
      setError('New column name is required');
      return;
    }

    // For operations that require two columns
    if (['+', '-', '*', '/', 'min', 'max', 'correlation'].includes(operator) && !secondColumn) {
      setError('Second column is required for this operation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `http://localhost:5000/calculate-statistics/${userId}/${fileId}`,
        {
          first_column: firstColumn,
          second_column: secondColumn,
          operator,
          new_column_name: newColumnName
        }
      );

      if (response.data.success) {
        setResult(response.data.result);
        toast({
          title: "Success",
          description: `Statistical calculation completed: ${response.data.message}`,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error performing calculation');
      console.error("Error calculating statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/apply-calculation/${userId}/${fileId}`,
        {
          new_column_name: newColumnName,
          result_data: result
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `New column "${newColumnName}" created successfully`,
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error applying calculation');
      console.error("Error applying calculation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Statistics Calculator
          </DialogTitle>
          <DialogDescription>
            Create new columns by performing operations on existing data.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          {/* First Column Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first-column" className="text-right">
              First Column
            </Label>
            <div className="col-span-3">
              <div className="relative">
                <Input
                  id="first-column-input"
                  value={firstColumnInput}
                  onChange={(e) => {
                    setFirstColumnInput(e.target.value);
                  }}
                  placeholder="Type to search columns..."
                  className="pr-10"
                />
                <Select value={firstColumn} onValueChange={setFirstColumn}>
                  <SelectTrigger className="absolute inset-y-0 right-0 flex items-center bg-transparent border-none shadow-none w-10">
                    <ChevronDown className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredFirstColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredFirstColumns.length > 0 && firstColumnInput && !filteredFirstColumns.includes(firstColumnInput) && (
                <div className="mt-1 rounded-md border border-gray-200 bg-white p-2 max-h-40 overflow-auto">
                  {filteredFirstColumns.map((col) => (
                    <div
                      key={col}
                      className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      onClick={() => {
                        setFirstColumn(col);
                        setFirstColumnInput(col);
                      }}
                    >
                      {col}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operator Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="operator" className="text-right">
              Operator
            </Label>
            <div className="col-span-3">
              <Select value={operator} onValueChange={(value) => setOperator(value as Operator)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      <div className="flex flex-col">
                        <span>{op.label}</span>
                        <span className="text-xs text-gray-500">{op.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Column Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="second-column" className="text-right">
              Second Column
            </Label>
            <div className="col-span-3">
              <div className="relative">
                <Input
                  id="second-column-input"
                  value={secondColumnInput}
                  onChange={(e) => {
                    setSecondColumnInput(e.target.value);
                  }}
                  placeholder="Type to search columns..."
                  className="pr-10"
                  disabled={['mean', 'stddev'].includes(operator)}
                />
                <Select 
                  value={secondColumn} 
                  onValueChange={setSecondColumn}
                  disabled={['mean', 'stddev'].includes(operator)}
                >
                  <SelectTrigger className="absolute inset-y-0 right-0 flex items-center bg-transparent border-none shadow-none w-10">
                    <ChevronDown className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSecondColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredSecondColumns.length > 0 && secondColumnInput && !filteredSecondColumns.includes(secondColumnInput) && !['mean', 'stddev'].includes(operator) && (
                <div className="mt-1 rounded-md border border-gray-200 bg-white p-2 max-h-40 overflow-auto">
                  {filteredSecondColumns.map((col) => (
                    <div
                      key={col}
                      className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      onClick={() => {
                        setSecondColumn(col);
                        setSecondColumnInput(col);
                      }}
                    >
                      {col}
                    </div>
                  ))}
                </div>
              )}
              {['mean', 'stddev'].includes(operator) && (
                <p className="text-xs text-gray-500 mt-1">
                  Second column not required for this operation.
                </p>
              )}
            </div>
          </div>

          {/* Output Column Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-column-name" className="text-right">
              Output Column
            </Label>
            <Input
              id="new-column-name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Enter new column name"
              className="col-span-3"
            />
          </div>

          {/* Preview of the Expression */}
          <div className="bg-gray-50 p-3 rounded-md mt-2">
            <Label className="text-sm text-gray-700 mb-2 block">Expression Preview:</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {firstColumn ? (
                <Badge variant="secondary" className="text-sm px-2 py-1">{firstColumn}</Badge>
              ) : (
                <span className="text-gray-400">[First Column]</span>
              )}
              
              <Badge className="bg-blue-500 text-sm px-2 py-1">
                {operatorOptions.find(op => op.value === operator)?.label || operator}
              </Badge>
              
              {!['mean', 'stddev'].includes(operator) && (
                secondColumn ? (
                  <Badge variant="secondary" className="text-sm px-2 py-1">{secondColumn}</Badge>
                ) : (
                  <span className="text-gray-400">[Second Column]</span>
                )
              )}
              
              <span className="text-gray-700">=</span>
              
              <Badge variant="outline" className="text-sm px-2 py-1 border-dashed">
                {newColumnName || "[Output Column]"}
              </Badge>
            </div>
          </div>

          {/* Result Preview (if available) */}
          {result && (
            <div className="bg-gray-50 p-3 rounded-md mt-2">
              <Label className="text-sm text-gray-700 mb-2 block">Calculation Result:</Label>
              <div className="text-sm">
                {typeof result === 'object' ? (
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                ) : (
                  <span>{result}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCalculate}
              disabled={loading || !firstColumn || (!secondColumn && !['mean', 'stddev'].includes(operator))}
              variant="secondary"
            >
              {loading ? "Processing..." : "Calculate"}
            </Button>
          </div>
          <Button
            onClick={handleApply}
            disabled={loading || !result}
            className="bg-black text-white hover:bg-gray-800"
          >
            {loading ? "Processing..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatisticsCalculator;