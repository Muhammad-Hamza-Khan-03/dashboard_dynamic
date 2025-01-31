import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: {
    columns: string[];
    title: string;
    position: { x: number; y: number };
  }) => void;
  position: { x: number; y: number };
  columns: Array<{ header: string; accessorKey: string }>;
}

const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  onExport,
  position,
  columns
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [title, setTitle] = useState('Data Table');

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSubmit = () => {
    if (selectedColumns.length === 0) return;

    onExport({
      columns: selectedColumns,
      title,
      position
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Data Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Table Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter table title"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Select Columns</Label>
            <ScrollArea className="h-[300px] mt-1.5 border rounded-lg">
              <div className="p-4 space-y-2">
                {columns.map((column) => (
                  <div 
                    key={column.accessorKey}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded"
                  >
                    <Checkbox
                      id={column.accessorKey}
                      checked={selectedColumns.includes(column.accessorKey)}
                      onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                    />
                    <Label
                      htmlFor={column.accessorKey}
                      className="flex-1 cursor-pointer"
                    >
                      {column.header}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedColumns.length === 0}
          >
            Create Table
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataTableModal;