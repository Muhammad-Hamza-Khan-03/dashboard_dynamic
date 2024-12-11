import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, Loader } from 'lucide-react';

interface File {
  file_id: string;
  filename: string;
}

interface FileSelectionPopoverProps {
  files: File[];
  loading: boolean;
  onSelect: (fileId: string) => void;
}

const FileSelectionPopover = ({ files, loading, onSelect }: FileSelectionPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <ScrollArea className="h-72">
          <div className="space-y-1 p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="animate-spin w-6 h-6 text-blue-500" />
              </div>
            ) : !files?.length ? (
              <p className="text-gray-500 text-center py-4">No files available</p>
            ) : (
              files.map((file) => (
                <Button
                  key={file.file_id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onSelect(file.file_id)}
                >
                  {file.filename}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default FileSelectionPopover;