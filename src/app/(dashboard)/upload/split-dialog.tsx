import React, { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { FlipHorizontal, Plus, Minus, FileText, Search } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>(''); // New state for search term
  const [filteredColumns, setFilteredColumns] = useState<string[]>(columns); // New state for filtered columns

  useEffect(() => {
    // Filter columns based on the search term
    if (searchTerm.trim() === '') {
      setFilteredColumns(columns);
    } else {
      setFilteredColumns(
        columns.filter((col) =>
          col.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, columns]);

  const handleSplit = async () => {
    if (!selectedColumn || !delimiter) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/split-column/${userId}/${fileId}`,
        {
          column: selectedColumn,
          delimiter,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Column</DialogTitle>
          <DialogDescription>
            Choose a column and delimiter to split its contents into multiple new columns.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Search Box */}
          <div className="space-y-2">
            <Label>Search Columns</Label>
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search columns..."
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Related Words Below Search Box */}
          {filteredColumns.length > 0 && (
            <div className="space-y-1">
              <Label>Related Columns</Label>
              <ul className="border border-gray-300 rounded-md max-h-32 overflow-y-auto">
                {filteredColumns.map((col) => (
                  <li
                    key={col}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setSearchTerm(col)} // Set search term when clicked
                  >
                    {col}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Select Column */}
          <div className="space-y-2">
            <Label>Select Column</Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Choose column to split" />
              </SelectTrigger>
              <SelectContent>
                {filteredColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Delimiter Input */}
          <div className="space-y-2">
            <Label>Delimiter</Label>
            <Input
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              placeholder="e.g. , or - or space"
            />
            <p className="text-xs text-gray-500">
              The character that separates parts of the data (e.g., "-" in "2022-09-22")
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSplit}
            disabled={!selectedColumn || !delimiter || isLoading}
          >
            {isLoading ? 'Processing...' : 'Split Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};