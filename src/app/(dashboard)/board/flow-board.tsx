import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  NodeTypes,
  ReactFlowProvider,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, Edit2, PenSquare, Check } from 'lucide-react';
import { useTheme } from './theme-provider';
import TextBoxNode from './TextBoxNode';
import DataTableNode from './dataTableNode';
import StatCardNode from './statCardNode';
import { Input } from "@/components/ui/input";

// CSS for enhanced drag and resize feedback
const additionalStyles = `
.node-dragging {
  opacity: 0.8;
  cursor: grabbing !important;
}

.node-resizing {
  outline: 2px dashed #3b82f6 !important;
  outline-offset: 2px;
}

.react-flow__node {
  transition: transform 0.1s ease, width 0.1s ease, height 0.1s ease;
}

.react-flow__node.selected {
  outline: 2px solid #3b82f6 !important;
  z-index: 10 !important;
}

.handle-feedback {
  display: none;
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
}

.resize-active .handle-feedback {
  display: block;
}
  

.node-dragging {
  opacity: 0.8 !important;
  cursor: grabbing !important;
  transform: scale(1.01) !important;
  z-index: 1000 !important;
  transition: none !important;
}

.node-drag-active {
  cursor: grabbing !important;
}

.react-flow__node {
  transition: transform 0.1s ease, width 0.1s ease, height 0.1s ease;
}

.react-flow__node.selected {
  outline: 2px solid #3b82f6 !important;
  z-index: 10 !important;
}

/* Additional optimization - makes the iframe unselectable during movement */
.node-dragging iframe {
  pointer-events: none !important;
}
.chart-moving {
  cursor: grabbing !important;
}

.chart-moving-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
}

.chart-moving-indicator-content {
  background-color: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.7; transform: scale(1); }
}

/* Additional optimization - disable all hover effects during movement */
.chart-moving * {
  pointer-events: none !important;
  transition: none !important;
}
`;

interface ChartNodeData {
  id: string;
  type: string;
  title: string;
  description?: string;
  graphUrl: string;
  position: { x: number; y: number; width?: number; height?: number; };
  onRemove: (id: string) => void;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
  onTitleChange: (id: string, title: string) => void;
}

interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface FlowBoardProps {
  charts: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    graphUrl: string;
    position: Position;
  }>;
  textBoxes: Array<{
    id: string;
    type: 'textbox';
    content: string;
    position: Position;
  }>;
  dataTables: Array<{
    id: string;
    columns: string[];
    data: any[];
    title: string;
    position: Position;
  }>;
  statCards: Array<{
    id: string;
    column: string;
    statType: string;
    title: string;
    position: Position;
    data: any[];
  }>;
  onChartPositionChange: (id: string, position: Position) => void;
  onChartRemove: (id: string) => void;
  onChartMaximize: (id: string) => void;
  onChartDescriptionChange: (id: string, description: string) => void;
  onChartTitleChange: (id: string, title: string) => void;
  onTextBoxPositionChange: (id: string, position: Position) => void;
  onTextBoxContentChange: (id: string, content: string) => void;
  onTextBoxRemove: (id: string) => void;
  onDataTablePositionChange: (id: string, position: Position) => void;
  onDataTableRemove: (id: string) => void;
  onStatCardPositionChange: (id: string, position: Position) => void;
  onStatCardRemove: (id: string) => void;
  maximizedChart: string | null;
  onAreaClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

// Custom node component for charts with optimized rendering
const ChartNode: React.FC<NodeProps<ChartNodeData>> = ({ data, selected, id }) => {
  const { boardTheme } = useTheme();
  const width = data.position?.width || 800;
  const height = data.position?.height || 600;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(data.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(true);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const node = document.querySelector(`[data-id="${id}"]`);
    
    if (node) {
      // Create a movement indicator element if it doesn't exist
      let indicator = node.querySelector('.chart-moving-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'chart-moving-indicator';
        indicator.innerHTML = '<div class="chart-moving-indicator-content">Moving...</div>';
        (indicator as HTMLElement).style.display = 'none';
        node.appendChild(indicator);
      }
      
      // Create mutation observer to watch for style changes (position and size)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            const style = (mutation.target as HTMLElement).getAttribute('style') || '';
            
            // Check if the change is a movement
            if (style.includes('transform') && !isMoving) {
              setIsMoving(true);
              setShouldRenderContent(false);
              node.classList.add('chart-moving');
              
              // Show the movement indicator immediately
              if (indicator) {
                (indicator as HTMLElement).style.display = 'flex';
              }
            }
          }
        });
      });
      
      // Start observing
      observer.observe(node, { attributes: true, attributeFilter: ['style'] });
      
      // Detect when movement stops
      const handleMouseUp = () => {
        if (isMoving) {
          setIsMoving(false);
          node.classList.remove('chart-moving');
          
          // Hide the movement indicator
          if (indicator) {
            (indicator as HTMLElement).style.display = 'none';
          }
          
          renderTimeoutRef.current = setTimeout(() => {
            setShouldRenderContent(true);
          }, 100);
        }
      };
      
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [id, isMoving]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    setTitle(data.title);
  }, [data.title]);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    data.onTitleChange(data.id, title);
  };

  // Detect movement and resizing
  useEffect(() => {
    const node = document.querySelector(`[data-id="${id}"]`);
    
    if (node) {
      // Create mutation observer to watch for style changes (position and size)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            const style = (mutation.target as HTMLElement).getAttribute('style') || '';
            
            // Check if the change is a movement
            if (style.includes('transform') && !isMoving) {
              setIsMoving(true);
              setShouldRenderContent(false);
              node.classList.add('node-dragging');
            }
            
            // Check if the change is a resize
            if ((style.includes('width') || style.includes('height')) && !isResizing) {
              setIsResizing(true);
              setShouldRenderContent(false);
              node.classList.add('node-resizing');
            }
          }
        });
      });
      
      // Start observing
      observer.observe(node, { attributes: true, attributeFilter: ['style'] });
      
      // Detect when movement and resizing stop
      const handleMouseUp = () => {
        if (isMoving) {
          setIsMoving(false);
          node.classList.remove('node-dragging');
          renderTimeoutRef.current = setTimeout(() => {
            setShouldRenderContent(true);
          }, 100);
        }
        
        if (isResizing) {
          setIsResizing(false);
          node.classList.remove('node-resizing');
          renderTimeoutRef.current = setTimeout(() => {
            setShouldRenderContent(true);
          }, 100);
        }
      };
      
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [id, isMoving, isResizing]);

  return (
    <Card 
      className={`shadow-lg transition-colors duration-200 overflow-hidden resize ${selected ? 'selected' : ''} ${isMoving ? 'node-dragging' : ''} ${isResizing ? 'node-resizing' : ''}`}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: boardTheme.nodeBackground,
        color: boardTheme.text,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.1)`,
        borderColor: boardTheme.primary,
        borderWidth: '2px',
        borderRadius: '12px'
      }}
    >
      <CardHeader className="cursor-move p-3 flex flex-col space-y-1 bg-gradient-to-r from-transparent to-blue-50/30 dark:to-blue-900/10">
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
              onClick={() => data.onDescriptionChange(data.id, data.description || '')}
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
        {data.description && (
          <p className="text-xs opacity-70 truncate" style={{ color: boardTheme.secondary }}>{data.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)] relative">
  {isMoving && (
    <div className="chart-moving-indicator">
      <div className="chart-moving-indicator-content">Moving...</div>
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
  );
};

// Define all node types with optimized components
const nodeTypes: NodeTypes = {
  chartNode: ChartNode,
  textBoxNode: TextBoxNode,
  dataTableNode: DataTableNode,
  statCardNode: StatCardNode,
};

const FlowBoard: React.FC<FlowBoardProps> = ({
  charts,
  textBoxes,
  dataTables,
  statCards,
  onChartPositionChange,
  onChartRemove,
  onChartMaximize,
  onChartDescriptionChange,
  onChartTitleChange,
  onTextBoxPositionChange,
  onTextBoxContentChange,
  onTextBoxRemove,
  onDataTablePositionChange,
  onDataTableRemove,
  onStatCardPositionChange,
  onStatCardRemove,
  maximizedChart,
  onAreaClick,
}) => {
  const { boardTheme: theme } = useTheme();
  const [isNodeMoving, setIsNodeMoving] = useState(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inject custom styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Create nodes from the props with optimized approach
  const createNodes = useCallback((): Node[] => {
    // Chart nodes
    const chartNodes: Node[] = charts.map((chart) => ({
      id: chart.id,
      type: 'chartNode',
      position: { x: chart.position.x, y: chart.position.y },
      style: { 
        width: chart.position.width || 800, 
        height: chart.position.height || 600 
      },
      data: {
        id: chart.id,
        nodeType: 'chart',
        position: chart.position,
        title: chart.title,
        description: chart.description,
        graphUrl: chart.graphUrl,
        width: chart.position.width,
        height: chart.position.height,
        onRemove: onChartRemove,
        isMaximized: maximizedChart === chart.id,
        onMaximizeToggle: onChartMaximize,
        onDescriptionChange: onChartDescriptionChange,
        onTitleChange: onChartTitleChange,
      },
      draggable: maximizedChart !== chart.id,
      selectable: maximizedChart !== chart.id,
      resizing: false,
    }));

    // Textbox nodes
    const textBoxNodes: Node[] = textBoxes.map((textBox) => ({
      id: textBox.id,
      type: 'textBoxNode',
      position: { x: textBox.position.x, y: textBox.position.y },
      style: textBox.position.width ? { 
        width: textBox.position.width, 
        height: textBox.position.height || 150 
      } : undefined,
      data: {
        id: textBox.id,
        nodeType: 'textbox',
        position: textBox.position,
        content: textBox.content,
        onRemove: onTextBoxRemove,
        onContentChange: onTextBoxContentChange,
      },
      draggable: true,
      selectable: true,
    }));
    
    // DataTable nodes
    const dataTableNodes: Node[] = dataTables.map((table) => ({
      id: table.id,
      type: 'dataTableNode',
      position: { x: table.position.x, y: table.position.y },
      style: table.position.width ? { 
        width: table.position.width, 
        height: table.position.height || 400 
      } : undefined,
      data: {
        id: table.id,
        nodeType: 'datatable',
        position: table.position,
        columns: table.columns,
        data: table.data,
        title: table.title,
        onRemove: onDataTableRemove,
      },
      draggable: true,
      selectable: true,
    }));
    
    // StatCard nodes
    const statCardNodes: Node[] = statCards.map((card) => ({
      id: card.id,
      type: 'statCardNode',
      position: { x: card.position.x, y: card.position.y },
      style: card.position.width ? { 
        width: card.position.width, 
        height: card.position.height || 180 
      } : undefined,
      data: {
        id: card.id,
        nodeType: 'statcard',
        position: card.position,
        column: card.column,
        statType: card.statType,
        title: card.title,
        data: card.data,
        onRemove: onStatCardRemove,
      },
      draggable: true,
      selectable: true,
    }));

    return [...chartNodes, ...textBoxNodes, ...dataTableNodes, ...statCardNodes];
  }, [
    charts,
    textBoxes,
    dataTables,
    statCards,
    maximizedChart,
    onChartRemove,
    onChartMaximize,
    onChartDescriptionChange,
    onChartTitleChange,
    onTextBoxRemove,
    onTextBoxContentChange,
    onDataTableRemove,
    onStatCardRemove,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when props change
  useEffect(() => {
    setNodes(createNodes());
  }, [charts, textBoxes, dataTables, statCards, createNodes, setNodes]);

  // Optimize node dragging with batched updates
  

  // Handle node dragging
  // Handle node dragging
  const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
    // Use a class-based approach instead of state updates for better performance
    document.body.classList.add('node-drag-active');
    
    // Get the node element
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
    if (nodeElement) {
      // Apply visual feedback directly to DOM for immediate response
      nodeElement.classList.add('node-dragging');
      
      // Hide iframe content directly for better performance
      const iframe = nodeElement.querySelector('iframe');
      if (iframe) {
        iframe.style.visibility = 'hidden';
      }
    }
  }, []);
  
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Remove global drag class
    document.body.classList.remove('node-drag-active');
    
    // Get the node element
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
    if (nodeElement) {
      // Remove visual feedback
      nodeElement.classList.remove('node-dragging');
      
      // Restore iframe visibility
      const iframe = nodeElement.querySelector('iframe');
      if (iframe) {
        // Use requestAnimationFrame for smoother visual transition
        requestAnimationFrame(() => {
          iframe.style.visibility = 'visible';
        });
      }
    }
  
    // Get computed style for dimensions
    let width: number | undefined = undefined;
    let height: number | undefined = undefined;
    
    if (nodeElement) {
      const computedStyle = window.getComputedStyle(nodeElement);
      width = parseInt(computedStyle.width);
      height = parseInt(computedStyle.height);
      
      if (isNaN(width)) width = undefined;
      if (isNaN(height)) height = undefined;
    } else if (node.style) {
      if (typeof node.style.width === 'number') {
        width = node.style.width;
      } else if (typeof node.style.width === 'string') {
        width = parseInt(node.style.width);
        if (isNaN(width)) width = undefined;
      }
      
      if (typeof node.style.height === 'number') {
        height = node.style.height;
      } else if (typeof node.style.height === 'string') {
        height = parseInt(node.style.height);
        if (isNaN(height)) height = undefined;
      }
    }
  
    // Update position data only after drag is complete
    const position: Position = { 
      x: node.position.x, 
      y: node.position.y,
      width,
      height
    };
      
    switch (node.data.nodeType) {
      case 'chart':
        onChartPositionChange(node.id, position);
        break;
      case 'textbox':
        onTextBoxPositionChange(node.id, position);
        break;
      case 'datatable':
        onDataTablePositionChange(node.id, position);
        break;
      case 'statcard':
        onStatCardPositionChange(node.id, position);
        break;
    }
  }, [
    onChartPositionChange,
    onTextBoxPositionChange,
    onDataTablePositionChange,
    onStatCardPositionChange,
  ]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full transition-colors duration-200"
           style={{ backgroundColor: theme.background }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onClick={(event: React.MouseEvent) => {
            if (!(event.target as HTMLElement).closest('.react-flow__node')) {
              onAreaClick(event as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
          fitView
          minZoom={0.1}
          maxZoom={5}
          snapToGrid
          snapGrid={[16, 16]}
          style={{ backgroundColor: theme.background }}
          className={isNodeMoving ? 'nodes-moving' : ''}
          nodesDraggable={!maximizedChart}
          proOptions={{ hideAttribution: true }}
        >
          <Background 
            color={theme.backgroundDots}
            gap={16} 
            size={1}
          />
          <Controls 
            style={{ 
              backgroundColor: theme.controlsBackground,
              color: theme.text,
              borderColor: theme.border
            }}
          />
          <MiniMap 
            nodeColor={() => theme.primary}
            maskColor={theme.minimapBackground}
            className="bg-white rounded-lg shadow-lg"
            style={{ backgroundColor: theme.controlsBackground }}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};



export default FlowBoard;