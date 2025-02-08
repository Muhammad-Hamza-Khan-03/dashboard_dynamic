import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DraggableCore } from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Maximize2, Minimize2, Edit2, Check } from 'lucide-react';
import 'react-resizable/css/styles.css';

// Update the Position interface to include size
interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface DraggableChartProps {
  id: string;
  title: string;
  description?: string;
  graphUrl: string;
  position: Position;
  onPositionChange: (id: string, position: Position) => void;
  onRemove: (id: string) => void;
  isMaximized?: boolean;
  onMaximizeToggle: (id: string) => void;
  onDescriptionChange?: (id: string, description: string) => void;
}

const DraggableChart: React.FC<DraggableChartProps> = ({
  id,
  title,
  description = '',
  graphUrl,
  position,
  onPositionChange,
  onRemove,
  isMaximized = false,
  onMaximizeToggle,
  onDescriptionChange
}) => {
  // Initialize state with position including size
  const [currentPosition, setCurrentPosition] = useState<Position>({
    x: position.x,
    y: position.y,
    width: position.width || 800, // Default width
    height: position.height || 600 // Default height
  });
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(description);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle iframe load for proper sizing
  const handleIframeLoad = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.style.height = isMaximized ? 'calc(100vh - 100px)' : '100%';
    }
  }, [isMaximized]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Drag handlers
  const handleDrag = useCallback((_e: any, data: { deltaX: number; deltaY: number }) => {
    setCurrentPosition(prev => ({
      ...prev,
      x: prev.x + data.deltaX,
      y: prev.y + data.deltaY
    }));
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setZIndex(100);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
    setZIndex(1);
    onPositionChange(id, currentPosition);
  }, [id, currentPosition, onPositionChange]);

  // Resize handler
  const handleResize = useCallback((e: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    setCurrentPosition(prev => ({
      ...prev,
      width: size.width,
      height: size.height
    }));
    // Trigger resize event for the chart
    if (iframeRef.current) {
      const event = new Event('resize');
      window.dispatchEvent(event);
    }
  }, []);

  // Handle description changes
  const handleDescriptionSave = useCallback(() => {
    setIsEditing(false);
    if (onDescriptionChange) {
      onDescriptionChange(id, currentDescription);
    }
  }, [id, currentDescription, onDescriptionChange]);

  // Style for maximized view
  const maximizedStyle = isMaximized ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1000,
    transform: 'none'
  } : undefined;

  return (
    <DraggableCore
      nodeRef={nodeRef}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      disabled={isMaximized}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          zIndex,
          transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
          ...maximizedStyle
        } as React.CSSProperties}
        className="transition-all duration-200"
      >
        {isMaximized ? (
          <Card className="w-full h-full shadow-lg">
            {/* Card content for maximized view */}
            {/* ... */}
          </Card>
        ) : (
          <ResizableBox
            width={currentPosition.width!}
            height={currentPosition.height!}
            onResize={handleResize}
            minConstraints={[400, 300]} // Minimum size
            maxConstraints={[1200, 800]} // Maximum size
            resizeHandles={['se']} // Only show bottom-right resize handle
            className="react-resizable"
          >
            <Card className="w-full h-full shadow-lg">
              <CardHeader className="drag-handle cursor-move p-3 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onMaximizeToggle(id)}
                    >
                      {isMaximized ? 
                        <Minimize2 className="h-4 w-4" /> : 
                        <Maximize2 className="h-4 w-4" />
                      }
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
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      ref={inputRef}
                      value={currentDescription}
                      onChange={(e) => setCurrentDescription(e.target.value)}
                      placeholder="Add description (e.g., TOP TEN SALES)"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDescriptionSave}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : currentDescription && (
                  <p className="text-sm text-gray-600">{currentDescription}</p>
                )}
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-90px)]">
                <iframe
                  ref={iframeRef}
                  src={graphUrl}
                  className="w-full h-full rounded-b-lg"
                  style={{
                    pointerEvents: isDragging ? 'none' : 'auto'
                  }}
                  title={title}
                  onLoad={handleIframeLoad}
                />
              </CardContent>
            </Card>
          </ResizableBox>
        )}
      </div>
    </DraggableCore>
  );
};

export default DraggableChart;