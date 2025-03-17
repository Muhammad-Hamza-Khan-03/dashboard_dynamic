import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Trash2, Edit, FilePlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ColumnManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  column: string;
  fileId: string;
  userId: string;
  onColumnChange: (action: string, oldColumn?: string, newColumn?: string) => void;
  activeTab?: string;
  allColumns?: string[];
}

const ColumnManagementDialog: React.FC<ColumnManagementDialogProps> = ({
  isOpen,
  onClose,
  column,
  fileId,
  userId,
  onColumnChange,
  activeTab = "rename",
  allColumns = []
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [newColumnName, setNewColumnName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, column]);

  // Function to reset the state
  const resetState = () => {
    setNewColumnName('');
    setDelimiter(',');
    setError(null);
    setLoading(false);
    // Always go back to default tab
    setCurrentTab(activeTab);
  };

  const handleRenameColumn = async () => {
    if (!newColumnName.trim()) {
      setError('New column name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `http://localhost:5000/rename-column/${userId}/${fileId}`,
        {
          oldName: column,
          newName: newColumnName
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Column renamed from "${column}" to "${newColumnName}"`,
        });
        onColumnChange('rename', column, newColumnName);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error renaming column');
      console.error("Error renaming column:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `http://localhost:5000/delete-column/${userId}/${fileId}`,
        { column }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Column "${column}" deleted successfully`,
        });
        onColumnChange('delete', column);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error deleting column');
      console.error("Error deleting column:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      setError('New column name is required');
      return;
    }

    if (!delimiter.trim()) {
      setError('Delimiter is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `http://localhost:5000/add-column/${userId}/${fileId}`,
        {
          sourceColumn: column,
          newColumnName: newColumnName,
          delimiter: delimiter,
          splitIndex: 0  // Default to first part
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `New column "${newColumnName}" added successfully`,
        });
        onColumnChange('add', undefined, newColumnName);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error adding column');
      console.error("Error adding column:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Column Management: {column}</DialogTitle>
          <DialogDescription>
            Modify column properties or perform operations on this column.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rename">
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </TabsTrigger>
            <TabsTrigger value="delete">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </TabsTrigger>
            <TabsTrigger value="split">
              <FilePlus className="h-4 w-4 mr-2" />
              Split
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="rename" className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                New Name
              </Label>
              <Input
                id="new-name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter new column name"
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameColumn}
                disabled={loading || !newColumnName.trim()}
                type="button"
              >
                {loading ? "Processing..." : "Rename Column"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the column "{column}"?
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteColumn}
                disabled={loading}
                type="button"
              >
                {loading ? "Processing..." : "Delete Column"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="split" className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="split-name" className="text-right">
                New Column
              </Label>
              <Input
                id="split-name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter new column name"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delimiter" className="text-right">
                Delimiter
              </Label>
              <Input
                id="delimiter"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                placeholder="Delimiter (e.g., comma, space)"
                className="col-span-3"
              />
            </div>
            <p className="text-sm text-gray-500">
              The new column will contain the first part of the data split by the delimiter.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddColumn}
                disabled={loading || !newColumnName.trim() || !delimiter.trim()}
                type="button"
              >
                {loading ? "Processing..." : "Create Column"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnManagementDialog;