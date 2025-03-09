import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, Edit2, PenSquare, Check } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Input } from "@/components/ui/input";

interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface ChartNodeData extends Record<string, unknown> {
  id: string;
  type: string;
  title: string;
  description?: string;
  graphUrl: string;
  position: Position;
  onRemove: (id: string) => void;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onPositionChange?: (id: string, position: Position) => void;
}

// Define your full node type with the required properties
interface ChartNodeFull {
  id: string;
  position: Position;
  data: ChartNodeData;
  selected?: boolean;
}

const ChartNode = ({ id, data, selected }: NodeProps<ChartNodeFull>) => {

  // Track first selection for handle animations
  const firstSelectedRef = useRef<boolean>(false);

  useEffect(() => {
    // Add animation class on first selection
    if (selected && !firstSelectedRef.current) {
      firstSelectedRef.current = true;
      const nodeElement = document.querySelector(`[data-id="${id}"]`);
      if (nodeElement) {
        nodeElement.classList.add('node-first-selected');
        // Remove class after animation completes
        setTimeout(() => {
          nodeElement?.classList.remove('node-first-selected');
        }, 1500);
      }
    }
  }, [selected, id]);
  
  const { boardTheme } = useTheme();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(data.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(data.description || '');
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(true);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  // Width and height state
  const [nodeWidth, setNodeWidth] = useState(data.position?.width || 800);
  const [nodeHeight, setNodeHeight] = useState(data.position?.height || 600);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  // Update based on movement state
  useEffect(() => {
    if (isMoving || isResizing) {
      setShouldRenderContent(false);
    } else {
      renderTimeoutRef.current = setTimeout(() => {
        setShouldRenderContent(true);
      }, 100);
    }
  }, [isMoving, isResizing]);

  // Focus on inputs when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
    
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingTitle, isEditingDescription]);

  // Update local state when props change
  useEffect(() => {
    setTitle(data.title);
    setDescription(data.description || '');
  }, [data.title, data.description]);

  const handleTitleSave = useCallback(() => {
    setIsEditingTitle(false);
    data.onTitleChange(data.id, title);
  }, [data, title]);

  const handleDescriptionSave = useCallback(() => {
    setIsEditingDescription(false);
    data.onDescriptionChange(data.id, description);
  }, [data, description]);

  // Handle resize events
  const onResize = useCallback((event: any, params: { x: number, y: number, width: number, height: number }) => {
    // Update local dimensions during resize for a more responsive feel
    setNodeWidth(params.width);
    setNodeHeight(params.height);
    setIsResizing(true);
    setShouldRenderContent(false);
  }, []);

  const onResizeStart = useCallback(() => {
    setIsResizing(true);
    setShouldRenderContent(false);
  }, []);

  const onResizeEnd = useCallback((event: any, params: { x: number, y: number, width: number, height: number }) => {
    const updatedPosition = {
      ...data.position,
      width: params.width,
      height: params.height
    };
    
    // Update the node dimensions in parent component
    if (data.onPositionChange) {
      data.onPositionChange(id, updatedPosition);
    }
    
    setIsResizing(false);
    renderTimeoutRef.current = setTimeout(() => {
      setShouldRenderContent(true);
    }, 100);
  }, [data, id]);

  // Disable resizing when maximized
  const isResizable = !data.isMaximized;

  return (
    <>
      {/* Enhanced NodeResizer with larger outline and handles */}
      {isResizable && selected && (
        <NodeResizer
          minWidth={400}
          minHeight={300}
          maxWidth={2000}
          maxHeight={1500}
          onResize={onResize}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          color={boardTheme.primary}
          handleStyle={{ 
            width: 14, 
            height: 14, 
            borderRadius: 7,
            backgroundColor: boardTheme.primary,
            borderColor: '#ffffff',
            borderWidth: 2,
            opacity: 0.8
          }}
          lineStyle={{ 
            borderWidth: 3, 
            borderColor: boardTheme.primary, 
            opacity: 0.5 
          }}
        />
      )}

      <Card 
        className={`shadow-lg transition-colors duration-200 overflow-hidden ${selected ? 'selected' : ''} ${isMoving ? 'node-dragging' : ''} ${isResizing ? 'node-resizing' : ''}`}
        style={{ 
          width: data.isMaximized ? '100%' : `${nodeWidth}px`, 
          height: data.isMaximized ? '100%' : `${nodeHeight}px`,
          backgroundColor: boardTheme.nodeBackground,
          color: boardTheme.text,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.1)`,
          borderColor: selected ? boardTheme.primary : boardTheme.border,
          borderWidth: selected ? '2px' : '1px',
          borderRadius: '12px'
        }}
      >
        <CardHeader className="cursor-move p-3 flex flex-col space-y-1 bg-gradient-to-r from-transparent to-blue-50/30 dark:to-blue-900/10 handle">
          <div className="flex items-center justify-between">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="font-semibold text-lg flex-grow mr-2"
              />
            ) : (
              <CardTitle className="text-lg font-semibold truncate mr-2">{data.title}</CardTitle>
            )}
            <div className="flex items-center space-x-1">
              {isEditingTitle ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
                  style={{ color: boardTheme.text }}
                  onClick={handleTitleSave}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
                  style={{ color: boardTheme.text }}
                  onClick={() => setIsEditingTitle(true)}
                >
                  <PenSquare className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
                style={{ color: boardTheme.text }}
                onClick={() => setIsEditingDescription(!isEditingDescription)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
                style={{ color: boardTheme.text }}
                onClick={() => data.onMaximizeToggle(data.id)}
              >
                {data.isMaximized ? 
                  <Minimize2 className="h-3.5 w-3.5" /> : 
                  <Maximize2 className="h-3.5 w-3.5" />
                }
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ color: boardTheme.text }}
                onClick={() => data.onRemove(data.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {isEditingDescription ? (
            <div className="mt-1">
              <Input
                ref={descriptionInputRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDescriptionSave()}
                placeholder="Add a description"
                className="text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-6 text-xs"
                onClick={handleDescriptionSave}
              >
                Save
              </Button>
            </div>
          ) : (
            data.description && (
              <p className="text-xs opacity-70 truncate" style={{ color: boardTheme.secondary }}>
                {data.description}
              </p>
            )
          )}
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-60px)] relative">
          {/* Overlay during movement/resizing to provide visual feedback */}
          {(isMoving || isResizing) && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/30 flex items-center justify-center z-10 transition-opacity duration-150">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-md text-blue-700 dark:text-blue-100 font-medium animate-pulse">
                {isMoving ? 'Moving...' : 'Resizing...'}
              </div>
            </div>
          )}
          
          {/* Only render the iframe when not moving/resizing for better performance */}
          {shouldRenderContent ? (
            <iframe
              src={`${data.graphUrl}?hideTitle=true`}
              className="w-full h-full"
              style={{ 
                backgroundColor: boardTheme.background,
                border: 'none'
              }}
              title={data.title}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <div className="text-sm text-center p-4 select-none">
                Chart content will appear when movement stops
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default memo(ChartNode);