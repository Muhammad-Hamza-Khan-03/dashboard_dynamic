import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DraggableCore } from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Maximize2, Minimize2, Edit2, Check, PenSquare } from 'lucide-react';
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
  onTitleChange?: (id: string, title: string) => void;
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
  onDescriptionChange,
  onTitleChange
}) => {
  // Initialize state with position including size
  const [currentPosition, setCurrentPosition] = useState<Position>({
    x: position.x,
    y: position.y,
    width: position.width || 800, // Default width
    height: position.height || 600 // Default height
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(description);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [resizeActive, setResizeActive] = useState(false);
  const [canResize, setCanResize] = useState(false);
  // Create a debounced chart rendering flag
  const [shouldRenderChart, setShouldRenderChart] = useState(true);
  const [isResizeMode, setIsResizeMode] = useState(false);

  const nodeRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update position when props change (from parent)
  useEffect(() => {
    setCurrentPosition({
      x: position.x,
      y: position.y,
      width: position.width || currentPosition.width,
      height: position.height || currentPosition.height
    });
  }, [position]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt key enables resize mode
      if (e.altKey) {
        setCanResize(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Alt key release disables resize mode
      if (!e.altKey) {
        setCanResize(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update title and description from props
  useEffect(() => {
    setCurrentTitle(title);
    setCurrentDescription(description);
  }, [title, description]);

  // Handle iframe load for proper sizing
  const handleIframeLoad = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.style.height = isMaximized ? 'calc(100vh - 100px)' : '100%';
    }
  }, [isMaximized]);

  // Focus input when editing
  useEffect(() => {
    if (isEditingDescription && inputRef.current) {
      inputRef.current.focus();
    }
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingDescription, isEditingTitle]);

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
    // Hide chart content during drag for better performance
    setShouldRenderChart(false);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
    setZIndex(1);
    onPositionChange(id, currentPosition);
    // Show chart content again after a small delay
    setTimeout(() => {
      setShouldRenderChart(true);
    }, 100);
  }, [id, currentPosition, onPositionChange]);

  // Enhanced resize handler with visual feedback
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    setResizeActive(true);
    setZIndex(100);
    // Hide chart content during resize for better performance
    setShouldRenderChart(false);
  }, []);

  // Update size during resize with minimal operations
  const handleResize = useCallback((_e: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    // Only update position state - keep operations minimal during active resize
    setCurrentPosition(prev => ({
      ...prev,
      width: size.width,
      height: size.height
    }));
    
    // Clear previous timeout if it exists
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
  }, []);

  // Resize stop handler with optimized updates
  const handleResizeStop = useCallback(() => {
    setIsResizing(false);
    setResizeActive(false);
    
    // Update parent component with new size
    onPositionChange(id, currentPosition);
    
    // Re-enable chart rendering after resize completes
    resizeTimeoutRef.current = setTimeout(() => {
      setShouldRenderChart(true);
      
      // Trigger resize event for the chart after a delay
      if (iframeRef.current) {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    }, 300);
  }, [id, currentPosition, onPositionChange]);

  // Handle description changes
  const handleDescriptionSave = useCallback(() => {
    setIsEditingDescription(false);
    if (onDescriptionChange) {
      onDescriptionChange(id, currentDescription);
    }
  }, [id, currentDescription, onDescriptionChange]);

  // Handle title changes
  const handleTitleSave = useCallback(() => {
    setIsEditingTitle(false);
    if (onTitleChange) {
      onTitleChange(id, currentTitle);
    }
  }, [id, currentTitle, onTitleChange]);

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
        className="transition-transform duration-100"
      >
        {isMaximized ? (
          <Card className="w-full h-full shadow-lg border-2 border-blue-500">
            <CardHeader className="drag-handle cursor-move p-3 flex flex-col space-y-2 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    className="font-semibold text-lg flex-grow mr-2"
                  />
                ) : (
                  <CardTitle className="text-lg font-semibold">{currentTitle}</CardTitle>
                )}
                <div className="flex items-center space-x-2">
                  {isEditingTitle ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleTitleSave}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      <PenSquare className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsEditingDescription(!isEditingDescription)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onMaximizeToggle(id)}
                  >
                    <Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={() => setIsResizeMode(!isResizeMode)}
>
  {isResizeMode ? 
    <div className="h-4 w-4 bg-blue-500 rounded-full"></div> : 
    <div className="h-4 w-4 border-2 border-gray-400 rounded-full"></div>
  }
</Button>
                    <Minimize2 className="h-4 w-4" />
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
              {isEditingDescription ? (
                <div className="flex items-center space-x-2">
                  <Input
                    ref={inputRef}
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    placeholder="Add description (e.g., TOP TEN SALES)"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleDescriptionSave()}
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
              {shouldRenderChart && (
                <iframe
                  ref={iframeRef}
                  src={graphUrl}
                  className="w-full h-full rounded-b-lg"
                  style={{
                    pointerEvents: isDragging ? 'none' : 'auto'
                  }}
                  title={currentTitle}
                  onLoad={handleIframeLoad}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <ResizableBox
  width={currentPosition.width!}
  height={currentPosition.height!}
  onResizeStart={handleResizeStart}
  onResize={handleResize}
  onResizeStop={handleResizeStop}
  minConstraints={[400, 300]}
  maxConstraints={[1600, 1000]}
  resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
  className={`react-resizable ${resizeActive ? 'resize-active' : ''} ${isResizeMode ? 'resize-mode' : ''}`}
>
{isResizeMode && (
  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full z-10">
    Resize Mode Active
  </div>
)}

            <Card 
              className={`w-full h-full shadow-lg border-2 ${
                isDragging || isResizing 
                  ? 'border-blue-700 bg-blue-50/20' 
                  : 'border-blue-500 hover:border-blue-600'
              } transition-colors duration-100`}
            >
              <CardHeader className="drag-handle cursor-move p-3 flex flex-col space-y-2 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center justify-between">
    
                  {isEditingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={currentTitle}
                      onChange={(e) => setCurrentTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                      className="font-semibold text-lg flex-grow mr-2"
                    />
                  ) : (
                    <CardTitle className="text-lg font-semibold">{currentTitle}</CardTitle>
                  )}
                  <div className="flex items-center space-x-2">
                    {isEditingTitle ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleTitleSave}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <PenSquare className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditingDescription(!isEditingDescription)}
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
                <p className="text-xs text-gray-500 mt-1">
  Press Alt key to enable resize mode
</p>
                {isEditingDescription ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      ref={inputRef}
                      value={currentDescription}
                      onChange={(e) => setCurrentDescription(e.target.value)}
                      placeholder="Add description (e.g., TOP TEN SALES)"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleDescriptionSave()}
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
              <CardContent className="p-0 h-[calc(100%-90px)] overflow-hidden">
              {isDragging && (
  <div className="chart-moving-indicator">
    <div className="animate-pulse">Moving Chart...</div>
  </div>
)}
                
                {shouldRenderChart ? (
                  <iframe
                    ref={iframeRef}
                    src={graphUrl}
                    className="w-full h-full rounded-b-lg"
                    style={{
                      pointerEvents: isDragging || isResizing ? 'none' : 'auto'
                    }}
                    title={currentTitle}
                    onLoad={handleIframeLoad}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-gray-500">Chart loading...</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ResizableBox>
        )}
      </div>
    </DraggableCore>
  );
};

const styles = `
.react-resizable-handle {
  display: none !important; /* Hide all resize handles by default */
}

/* Only show handles when specifically in resize mode */
.resize-mode .react-resizable-handle {
  display: block !important;
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #3b82f6;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  opacity: 0.7;
  z-index: 10;
}

.resize-mode .react-resizable-handle:hover {
  opacity: 1;
  transform: scale(1.2);
}

/* Loading indicator style for movement */
.chart-moving-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 100;
  pointer-events: none;
}

.chart-moving-indicator div {
  background-color: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
`;


export default DraggableChart;