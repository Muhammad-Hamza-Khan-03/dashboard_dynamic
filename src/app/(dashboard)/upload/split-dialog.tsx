'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FlipHorizontal } from 'lucide-react';
import axios from 'axios';

interface SplitDialogProps {
  columns: string[];
  fileId: string;
  userId: string;
  onSplitComplete: (newData: any[]) => void;
}

export const SplitDialog = ({ columns, fileId, userId, onSplitComplete }: SplitDialogProps) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>('');
  const [prefix, setPrefix] = useState<string>('split');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSplit = async () => {
    if (!selectedColumn || !delimiter) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/split-column/${userId}/${fileId}`,
        {
          column: selectedColumn,
          delimiter,
          newColumnPrefix: prefix
        }
      );

      if (response.data.success) {
        onSplitComplete(response.data.data);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error splitting column:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FlipHorizontal className="h-4 w-4" />
          Split Column
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split Column</DialogTitle>
          <DialogDescription>
            Choose a column and delimiter to split its contents into new columns.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select Column</Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Choose column to split" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label>Delimiter</Label>
            <Input
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              placeholder="e.g. , or | or space"
            />
          </div>
          
          <div className="space-y-2">
            <Label>New Column Prefix</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. split"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSplit} disabled={!selectedColumn || !delimiter || isLoading}>
            {isLoading ? 'Processing...' : 'Split Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};