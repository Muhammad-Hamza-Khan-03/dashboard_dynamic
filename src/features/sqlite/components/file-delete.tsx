import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";
import axios from 'axios';
import { useUser } from '@clerk/nextjs';

interface FileDeleteProps {
  fileList: string[];
  onDeleteSuccess: () => void;
}

const FileDelete: React.FC<FileDeleteProps> = ({ fileList, onDeleteSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();

  const handleCheckboxChange = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      await Promise.all(selectedFiles.map(filename => 
        axios.delete(`http://localhost:5000/delete_file/${user.id}/${filename}`)
      ));

      toast({
        title: 'Success',
        description: `${selectedFiles.length} file(s) deleted successfully!`,
        duration: 3000,
      });

      onDeleteSuccess();
      setSelectedFiles([]);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error deleting files:", err);
      toast({
        title: 'Error',
        description: 'Failed to delete files. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Trash2 className="w-4 h-4" />
          <span>Delete Files</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Files</DialogTitle>
          <DialogDescription>
            Select the files you want to delete. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 h-[200px] rounded-md border p-4">
          {fileList.map((file) => (
            <div key={file} className="flex items-center space-x-2 py-2">
              <Checkbox
                id={file}
                checked={selectedFiles.includes(file)}
                onCheckedChange={() => handleCheckboxChange(file)}
              />
              <label htmlFor={file} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {file}
              </label>
            </div>
          ))}
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={selectedFiles.length === 0}
          >
            Delete {selectedFiles.length} file(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileDelete;