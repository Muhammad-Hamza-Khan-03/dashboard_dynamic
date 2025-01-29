import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Edit2, Check } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

interface TextBoxProps {
  id: string;
  content: string;
  position: { x: number; y: number };
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onContentChange: (id: string, content: string) => void;
  onRemove: (id: string) => void;
  title?: string;
}

const TextBox: React.FC<TextBoxProps> = ({
  id,
  content,
  position,
  onPositionChange,
  onContentChange,
  onRemove,
  title = "Note"
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = () => {
    onContentChange(id, currentContent);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentContent(content);
    }
  };

  return (
    <Card className="min-w-[200px] max-w-[400px] shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader className="p-3 cursor-move">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRemove(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              placeholder="Enter your text here..."
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentContent(content);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-sm max-w-none whitespace-pre-wrap"
            style={{ minHeight: '100px' }}
          >
            {content || 'Click edit to add content'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TextBox;