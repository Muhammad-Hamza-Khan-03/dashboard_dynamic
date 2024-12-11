import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText } from 'lucide-react';

interface FileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: Array<{ id: string; name: string }>;
  onFileSelect: (fileId: string) => void;
}

const FileDrawer: React.FC<FileDrawerProps> = ({
  isOpen,
  onClose,
  files,
  onFileSelect,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px]">
        <SheetHeader>
          <SheetTitle>Select File</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4">
          <div className="space-y-2 pr-4">
            {files.map((file) => (
              <Button
                key={file.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onFileSelect(file.id);
                  onClose();
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="truncate">{file.name}</span>
              </Button>
            ))}
            {files.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No files available
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default FileDrawer;