import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, AlertCircle, FileSpreadsheet, ChevronRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatisticsCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  userId: string;
  onColumnAdded?: () => void;
}

type Operator = '+' | '-' | '*' | '/' | 'min' | 'max' | 'mean' | 'correlation' | 'stddev';

interface OperatorInfo {
  value: Operator;
  label: string;
  description: string;
  requiresSecondColumn: boolean;
}

const OPERATORS: OperatorInfo[] = [
  { value: '+', label: 'Add', description: 'Sum of two columns', requiresSecondColumn: true },
  { value: '-', label: 'Subtract', description: 'Difference between columns', requiresSecondColumn: true },
  { value: '*', label: 'Multiply', description: 'Product of two columns', requiresSecondColumn: true },
  { value: '/', label: 'Divide', description: 'Division of first column by second', requiresSecondColumn: true },
  { value: 'min', label: 'Minimum', description: 'Smallest value between columns', requiresSecondColumn: true },
  { value: 'max', label: 'Maximum', description: 'Largest value between columns', requiresSecondColumn: true },
  { value: 'mean', label: 'Average', description: 'Average of values in column(s)', requiresSecondColumn: false },
  { value: 'correlation', label: 'Correlation', description: 'Correlation coefficient between columns', requiresSecondColumn: true },
  { value: 'stddev', label: 'Standard Deviation', description: 'Standard deviation of column(s)', requiresSecondColumn: false }
];

const EnhancedStatisticsCalculator: React.FC<StatisticsCalculatorProps> = ({
  isOpen,
  onClose,
  fileId,
  userId,
  onColumnAdded
}) => {
  // Main state
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [firstColumn, setFirstColumn] = useState<string>('');
  const [secondColumn, setSecondColumn] = useState<string>('');
  const [operator, setOperator] = useState<Operator>('+');
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("calculate");

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFirstColumn('');
      setSecondColumn('');
      setOperator('+');
      setNewColumnName('');
      setError(null);
      setResult(null);
      setActiveTab("calculate");
      fetchColumns();
    }
  }, [isOpen, fileId, userId]);

  // Get current operator info
  const currentOperator = useMemo(() => 
    OPERATORS.find(op => op.value === operator) || OPERATORS[0]
  , [operator]);

  // Fetch columns from the file
  const fetchColumns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);
      
      if (response.data.columns) {
        setColumns(response.data.columns);
        
        // Try to identify numeric columns by looking at the first few rows
        if (response.data.data && response.data.data.length > 0) {
          const numCols = response.data.columns.filter((col: string | number) => {
            // Check first 5 rows (or fewer if less available)
            const sampleSize = Math.min(5, response.data.data.length);
            for (let i = 0; i < sampleSize; i++) {
              const val = response.data.data[i][col];
              if (val !== null && val !== undefined && !isNaN(Number(val))) {
                return true;
              }
            }
            return false;
          });
          setNumericColumns(numCols);
          
          // Pre-select first numeric column if available
          if (numCols.length > 0) {
            setFirstColumn(numCols[0]);
            if (numCols.length > 1) {
              setSecondColumn(numCols[1]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
      setError('Failed to load columns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate suggested column name when columns and operator change
  useEffect(() => {
    if (firstColumn && operator) {
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
      
      let suggestedName = '';
      
      if (currentOperator.requiresSecondColumn && secondColumn) {
        suggestedName = `${firstColumn}${operatorSymbols[operator]}${secondColumn}`;
      } else {
        suggestedName = `${firstColumn}${operatorSymbols[operator]}`;
      }
      
      setNewColumnName(suggestedName);
    }
  }, [firstColumn, secondColumn, operator, currentOperator]);

  // Handle calculation
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
    if (currentOperator.requiresSecondColumn && !secondColumn) {
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
        setActiveTab("preview");
        toast({
          title: "Success",
          description: response.data.message,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error performing calculation');
      console.error("Error calculating statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle apply calculation
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
        
        // Call the onColumnAdded callback if provided
        if (onColumnAdded) {
          onColumnAdded();
        }
        
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error applying calculation');
      console.error("Error applying calculation:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render preview of calculation results
  const renderResultPreview = () => {
    if (!result) return null;
    
    // Scalar result (like correlation)
    if (typeof result === 'number') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-center text-lg font-medium">{result.toFixed(4)}</p>
          </div>
          <p className="text-sm text-gray-600">
            The calculated value will be applied to all rows in the dataset.
          </p>
        </div>
      );
    }
    
    // Series result with statistics
    if (result.stats) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <dl className="space-y-1 text-sm">
                  {Object.entries(result.stats).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2">
                      <dt className="text-gray-600 capitalize">{key}:</dt>
                      <dd className="font-mono text-right">
                        {typeof value === 'number' ? 
                          (Number.isInteger(value) ? value : value.toFixed(4)) : 
                          String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Sample Values</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <dl className="space-y-1 text-sm">
                  {result.sample && Object.entries(result.sample).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2">
                      <dt className="text-gray-600">Row {Number(key) + 1}:</dt>
                      <dd className="font-mono text-right">
                        {typeof value === 'number' ? 
                          (Number.isInteger(value) ? value : value.toFixed(4)) : 
                          String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-sm text-gray-600">
            The calculation will create a new column named "{newColumnName}" with {result.stats.count} values.
            {result.stats.missing > 0 && ` (${result.stats.missing} missing values)`}
          </p>
        </div>
      );
    }
    
    return (
      <p className="text-sm text-gray-600">
        Calculation complete. Click "Apply" to create the new column.
      </p>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Column Calculator
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculate">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!result}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculate" className="space-y-4 py-3 overflow-y-auto max-h-[60vh]">
            {loading && !columns.length ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Operation selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Operation</label>
                    <Select value={operator} onValueChange={(value) => setOperator(value as Operator)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value} className="py-2">
                            <div className="flex items-center">
                              <span className="font-medium">{op.label}</span>
                              <span className="ml-2 text-xs text-gray-500">({op.description})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Column selectors */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Column</label>
                      <Select value={firstColumn} onValueChange={setFirstColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select first column" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {currentOperator.requiresSecondColumn && (
                      <div>
                        <label className="text-sm font-medium">Second Column</label>
                        <Select value={secondColumn} onValueChange={setSecondColumn}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select second column" />
                          </SelectTrigger>
                          <SelectContent>
                            {numericColumns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                
                  {/* Output column name */}
                  <div>
                    <label className="text-sm font-medium">New Column Name</label>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Enter name for new column"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Expression preview */}
                  <div className="bg-gray-50 p-3 rounded-md my-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Expression:</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {firstColumn ? (
                        <Badge variant="outline" className="bg-blue-50">
                          {firstColumn}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">[Column 1]</span>
                      )}
                      
                      <Badge className="bg-blue-500">
                        {currentOperator.label}
                      </Badge>
                      
                      {currentOperator.requiresSecondColumn && (
                        secondColumn ? (
                          <Badge variant="outline" className="bg-blue-50">
                            {secondColumn}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">[Column 2]</span>
                        )
                      )}
                      
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      
                      <Badge variant="outline" className="border-dashed border-blue-300">
                        {newColumnName || "[New Column]"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleCalculate}
                  className="w-full"
                  disabled={loading || !firstColumn || (currentOperator.requiresSecondColumn && !secondColumn)}
                >
                  {loading ? "Processing..." : "Calculate"}
                </Button>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4 py-3 overflow-y-auto max-h-[60vh]">
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {renderResultPreview()}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {result && (
            <Button
              onClick={handleApply}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-800"
            >
              {loading ? "Processing..." : "Apply to Dataset"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedStatisticsCalculator;