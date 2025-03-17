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
import { AlertCircle, FileEdit } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RenameFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  userId: string;
  currentFilename: string;
  onFileRenamed: (newFilename: string) => void;
}

const RenameFileDialog: React.FC<RenameFileDialogProps> = ({
  isOpen,
  onClose,
  fileId,
  userId,
  currentFilename,
  onFileRenamed
}) => {
  const [newFilename, setNewFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Extract just the base filename without extension
      const baseFilename = currentFilename.split('.')[0];
      setNewFilename(baseFilename);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, currentFilename]);

  const handleRenameFile = async () => {
    if (!newFilename.trim()) {
      setError('New filename is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Preserve the file extension
      const fileExtension = currentFilename.includes('.') 
        ? '.' + currentFilename.split('.').pop() 
        : '';
      
      const fullNewFilename = `${newFilename}${fileExtension}`;

      const response = await axios.post(
        `http://localhost:5000/rename-file/${userId}/${fileId}`,
        { newFilename: fullNewFilename }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `File renamed from "${currentFilename}" to "${fullNewFilename}"`,
        });
        onFileRenamed(fullNewFilename);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error renaming file');
      console.error("Error renaming file:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileEdit className="h-5 w-5 mr-2" />
            Rename File
          </DialogTitle>
          <DialogDescription>
            Change the name of your file. This will update all references.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-filename" className="text-right">
              Current Name
            </Label>
            <Input
              id="current-filename"
              value={currentFilename}
              readOnly
              className="col-span-3 bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-filename" className="text-right">
              New Name
            </Label>
            <Input
              id="new-filename"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="Enter new filename"
              className="col-span-3"
            />
          </div>
          <p className="text-xs text-gray-500">
            Note: The file extension will be preserved automatically.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameFile}
            disabled={loading || !newFilename.trim()}
          >
            {loading ? "Processing..." : "Rename File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameFileDialog;