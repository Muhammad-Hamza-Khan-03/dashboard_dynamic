import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  NodeTypes,
  ReactFlowProvider,
  Panel,
  NodeMouseHandler,
  NodeProps as XYNodeProps,
  OnNodeDrag,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, Edit2, PenSquare, Check } from 'lucide-react';
import { useTheme } from './theme-provider';
import TextBoxNode from './TextBoxNode';
import DataTableNode from './dataTableNode';
import StatCardNode from './statCardNode';
import ChartNode from './chartNode'; // We'll create this component
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import './noderesizerstyles.css';

// CSS for enhanced drag and resize feedback
const additionalStyles = `
.node-dragging {
  opacity: 0.8;
  cursor: grabbing !important;
}

.react-flow__node {
  transition: transform 0.1s ease, width 0.1s ease, height 0.1s ease;
}

.react-flow__node.selected {
  outline: 2px solid #3b82f6 !important;
  z-index: 10 !important;
}

.node-dragging iframe {
  pointer-events: none !important;
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
`;

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
  
  // Define node types with our resizable chart node
  const nodeTypes = {
    chartNode: ChartNode as unknown as React.ComponentType<XYNodeProps>,
    textBoxNode: TextBoxNode as unknown as React.ComponentType<XYNodeProps>,
    dataTableNode: DataTableNode as unknown as React.ComponentType<XYNodeProps>,
    statCardNode: StatCardNode as unknown as React.ComponentType<XYNodeProps>
  } as NodeTypes;
  
  // Create nodes from the props with optimized approach
  const createNodes = useCallback((): Node[] => {
    // Chart nodes with added position change handler
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
        onPositionChange: onChartPositionChange, // Add the position change handler
      },
      draggable: maximizedChart !== chart.id,
      selectable: maximizedChart !== chart.id,
    }));

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
        onPositionChange: onTextBoxPositionChange,
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
        onPositionChange: onDataTablePositionChange,
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
        onPositionChange: onStatCardPositionChange,
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
    onChartPositionChange,
    onTextBoxRemove,
    onTextBoxContentChange,
    onTextBoxPositionChange,
    onDataTableRemove,
    onDataTablePositionChange,
    onStatCardRemove,
    onStatCardPositionChange,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when props change
  useEffect(() => {
    setNodes(createNodes());
  }, [charts, textBoxes, dataTables, statCards, createNodes, setNodes]);

  // Handle node dragging
  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    // Use a class-based approach for better performance
    document.body.classList.add('node-drag-active');
  }, []);
  
  const onNodeDragStop: NodeMouseHandler = useCallback((event, node) => {
    // Remove global drag class
    document.body.classList.remove('node-drag-active');
  
    // Get computed style for dimensions
    let width: number | undefined = undefined;
    let height: number | undefined = undefined;
  
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
  
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
  
    // Update position data
    const position = {
      x: node.position.x,
      y: node.position.y,
      width,
      height,
    };
  
    // Call appropriate handler based on node type
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
      default:
        break;
    }
  }, [
    onChartPositionChange,
    onTextBoxPositionChange,
    onDataTablePositionChange,
    onStatCardPositionChange,
  ]);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest('.react-flow__node')) {
      onAreaClick(event as React.MouseEvent<HTMLDivElement>);
    }
  }, [onAreaClick]);

  // Add a style element to inject our additional styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
    
    // Set CSS variables for theming the resize handles
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--background-color', theme.background);
    document.documentElement.style.setProperty('--text-color', theme.text);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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
          onClick={handlePaneClick}
          fitView
          minZoom={0.1}
          maxZoom={5}
          snapToGrid
          snapGrid={[16, 16]}
          style={{ backgroundColor: theme.background }}
          nodesDraggable={!maximizedChart}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null} // Disable default delete key handling
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
          <Panel position="top-right">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select and resize nodes by dragging the handles
              </p>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowBoard;