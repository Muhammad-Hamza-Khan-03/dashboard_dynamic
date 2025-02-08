import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, Loader, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileSelectionPopoverProps {
  files: Array<{ file_id: string; filename: string; }>;
  loading: boolean;
  selectedFileId: string | null;
  onSelect: (fileId: string) => void;
}

const FileSelectionPopover = ({ 
  files, 
  loading, 
  selectedFileId,
  onSelect 
}: FileSelectionPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="hover:bg-gray-100"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-2" side="bottom" align="start">
        <ScrollArea className="h-[400px] pr-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : !files?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No files available
            </p>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <TooltipProvider key={file.file_id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 font-normal h-auto py-3",
                          "whitespace-normal text-left break-words",
                          selectedFileId === file.file_id && "bg-blue-50 text-blue-600 hover:bg-blue-50/80"
                        )}
                        onClick={() => onSelect(file.file_id)}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">{file.filename}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="max-w-[300px] break-words"
                    >
                      {file.filename}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default FileSelectionPopover;