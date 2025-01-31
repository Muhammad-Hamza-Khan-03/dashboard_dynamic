import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

interface StatCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: {
    column: string;
    statType: string;
    title: string;
    position: { x: number; y: number };
  }) => void;
  position: { x: number; y: number };
  columns: Array<{ header: string; accessorKey: string; isNumeric: boolean }>;
}

const StatCardModal: React.FC<StatCardModalProps> = ({
  isOpen,
  onClose,
  onExport,
  position,
  columns
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedStat, setSelectedStat] = useState<string>('count');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumn('');
      setSelectedStat('count');
      setTitle('');
      setError(null);
    }
  }, [isOpen]);

  // Update title when selections change
  useEffect(() => {
    if (selectedColumn && selectedStat) {
      const column = columns.find(col => col.accessorKey === selectedColumn);
      const statLabel = statOptions.find(opt => opt.value === selectedStat)?.label;
      if (column && statLabel) {
        setTitle(`${statLabel} of ${column.header}`);
      }
    }
  }, [selectedColumn, selectedStat, columns]);

  const statOptions = [
    { value: 'count', label: 'Count', requiresNumeric: false },
    { value: 'sum', label: 'Sum', requiresNumeric: true },
    { value: 'mean', label: 'Average', requiresNumeric: true },
    { value: 'mode', label: 'Mode', requiresNumeric: false },
    { value: 'max', label: 'Maximum', requiresNumeric: true },
    { value: 'min', label: 'Minimum', requiresNumeric: true }
  ];

  const handleStatTypeChange = (value: string) => {
    const statOption = statOptions.find(opt => opt.value === value);
    const selectedColumnData = columns.find(col => col.accessorKey === selectedColumn);
    
    if (statOption?.requiresNumeric && selectedColumnData && !selectedColumnData.isNumeric) {
      setError(`${statOption.label} can only be calculated for numeric columns`);
      return;
    }
    
    setSelectedStat(value);
    setError(null);
  };

  const handleColumnChange = (value: string) => {
    const columnData = columns.find(col => col.accessorKey === value);
    const statOption = statOptions.find(opt => opt.value === selectedStat);
    
    if (statOption?.requiresNumeric && columnData && !columnData.isNumeric) {
      setError(`${statOption.label} can only be calculated for numeric columns`);
    } else {
      setError(null);
    }
    
    setSelectedColumn(value);
  };

  const handleSubmit = () => {
    if (!selectedColumn || !selectedStat) {
      setError('Please select both a column and a statistic type');
      return;
    }

    if (error) return;

    onExport({
      column: selectedColumn,
      statType: selectedStat,
      title,
      position
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Statistical Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Column Selection */}
          <div className="space-y-1.5">
            <Label>Select Column</Label>
            <Select value={selectedColumn} onValueChange={handleColumnChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(column => (
                  <SelectItem 
                    key={column.accessorKey} 
                    value={column.accessorKey}
                  >
                    {column.header} {column.isNumeric ? '(Numeric)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statistic Type Selection */}
          <div className="space-y-1.5">
            <Label>Select Statistic</Label>
            <Select value={selectedStat} onValueChange={handleStatTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a statistic" />
              </SelectTrigger>
              <SelectContent>
                {statOptions.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Card Title */}
          <div className="space-y-1.5">
            <Label>Card Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title"
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedColumn || !selectedStat || !!error}
          >
            Create Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatCardModal;