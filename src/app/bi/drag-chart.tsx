import React, { useState, useCallback, useRef } from 'react';
import { DraggableCore } from 'react-draggable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface DraggableChartProps {
  id: string;
  title: string;
  graphUrl: string;
  position: Position;
  onPositionChange: (id: string, position: Position) => void;
  onRemove: (id: string) => void;
  isMaximized?: boolean;
  onMaximizeToggle: (id: string) => void;
}

const DraggableChart: React.FC<DraggableChartProps> = ({
  id,
  title,
  graphUrl,
  position,
  onPositionChange,
  onRemove,
  isMaximized,
  onMaximizeToggle
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position>(position);
  const [zIndex, setZIndex] = useState(1);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((_e: any, data: { deltaX: number; deltaY: number }) => {
    setCurrentPosition(prev => ({
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

  const chartStyle = isMaximized ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1000,
    transform: 'none'
  } : {
    position: 'absolute',
    width: '400px',
    height: '300px',
    zIndex,
    transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`
  };

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
        style={chartStyle as React.CSSProperties}
        className="transition-colors duration-200"
      >
        <Card className="w-full h-full shadow-lg">
          <CardHeader className="drag-handle cursor-move p-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className="flex items-center space-x-1">
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
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={graphUrl}
              className="w-full rounded-b-lg"
              style={{
                height: isMaximized ? 'calc(100vh - 45px)' : '255px',
                pointerEvents: isDragging ? 'none' : 'auto'
              }}
              title={title}
            />
          </CardContent>
        </Card>
      </div>
    </DraggableCore>
  );
};

export default DraggableChart;