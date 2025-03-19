import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ColumnMetadata {
  type: 'numeric' | 'categorical';
  min?: number;
  max?: number;
  mean?: number;
  unique_values: number;
  value_counts: Record<string, number>;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeColumn: string | null;
  userId: string;
  fileId: string;
  onApplyFilters: (filters: any) => void;
}

export default function FilterSidebar({
  isOpen,
  onClose,
  activeColumn,
  userId,
  fileId,
  onApplyFilters,
}: FilterSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<ColumnMetadata | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<string>('');

  useEffect(() => {
    if (isOpen && activeColumn) {
      fetchColumnMetadata();
    } else {
      // Reset state when sidebar closes
      setFilterValue(null);
      setMinValue('');
      setMaxValue('');
      setSortDirection('');
    }
  }, [isOpen, activeColumn]);

  const fetchColumnMetadata = async () => {
    if (!activeColumn) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/get-column-metadata/${userId}/${fileId}/${activeColumn}`
      );
      setMetadata(response.data);
    } catch (error) {
      console.error('Error fetching column metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!activeColumn) return;

    const filters: any = {};
    if (metadata?.type === 'numeric') {
      if (minValue || maxValue) {
        filters[activeColumn] = {
          min: minValue ? parseFloat(minValue) : undefined,
          max: maxValue ? parseFloat(maxValue) : undefined
        };
      }
    } else if (filterValue !== null) {
      filters[activeColumn] = filterValue;
    }

    const sortBy = sortDirection ? {
      column: activeColumn,
      direction: sortDirection
    } : undefined;

    onApplyFilters({ filters, sortBy });
    onClose();
  };

  const renderFilterControls = () => {
    if (!metadata) return null;

    if (metadata.type === 'numeric') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Value</Label>
              <Input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder={metadata.min?.toString()}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Max Value</Label>
              <Input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder={metadata.max?.toString()}
                className="mt-1.5"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Distribution Overview</Label>
            <ScrollArea className="h-40 rounded-md border">
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Mean:</span>
                  <span>{metadata.mean?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Unique Values:</span>
                  <span>{metadata.unique_values}</span>
                </div>
                <div className="mt-4">
                  <Label className="text-sm">Common Values</Label>
                  {Object.entries(metadata.value_counts).map(([value, count]) => (
                    <div key={value} className="flex justify-between items-center py-1 text-sm">
                      <span>{parseFloat(value).toFixed(2)}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      );
    }

    const validValues = Object.entries(metadata.value_counts)
      .filter(([value]) => value !== null && value !== undefined && value !== '')
      .map(([value, count]) => ({
        value: value === '' ? '(Empty)' : value,
        displayValue: value === '' ? '(Empty)' : value,
        count
      }));

    return (
      <div className="space-y-4">
        <div>
          <Label>Filter Value</Label>
          <Select
            value={filterValue || undefined}
            onValueChange={setFilterValue}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              {validValues.map(({ value, displayValue, count }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex justify-between items-center w-full">
                    <span>{displayValue}</span>
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Value Distribution</Label>
          <ScrollArea className="h-40 rounded-md border">
            <div className="p-4 space-y-2">
              {validValues.map(({ value, displayValue, count }) => (
                <div key={value} className="flex justify-between items-center py-1">
                  <span className="text-sm">{displayValue}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter and Sort: {activeColumn}</SheetTitle>
          <SheetDescription>
            Configure filters and sorting options for this column
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {renderFilterControls()}

              <div>
                <Label>Sort Direction</Label>
                <Select
                  value={sortDirection}
                  onValueChange={setSortDirection}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="none">No Sorting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  Apply Filters
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}