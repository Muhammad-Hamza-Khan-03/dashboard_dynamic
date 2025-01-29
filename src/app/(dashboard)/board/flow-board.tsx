import React, { useCallback, useEffect } from 'react';
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
import { X, Maximize2, Minimize2, Edit2 } from 'lucide-react';
import { useTheme } from './theme-provider';
import TextBoxNode from './TextBoxNode';

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
}

interface BaseNodeData {
  id: string;
  nodeType: 'chart' | 'textbox';  // This discriminator helps TypeScript know which type we're dealing with
  position: { x: number; y: number };
  onRemove: (id: string) => void;
}

// Chart-specific properties
interface ChartSpecificData extends BaseNodeData {
  nodeType: 'chart';
  title: string;
  description?: string;
  graphUrl: string;
  width?: number;
  height?: number;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
}

// Textbox-specific properties
interface TextBoxSpecificData extends BaseNodeData {
  nodeType: 'textbox';
  content: string;
  onContentChange: (id: string, content: string) => void;
}

// This union type represents all possible node data types
type FlowNodeData = ChartSpecificData | TextBoxSpecificData;

// Type for a node in our flow
type FlowNode = Node<FlowNodeData>;

interface TextBoxNodeData {
  id: string;
  type: 'textbox';
  content: string;
  position: { x: number; y: number };
  onContentChange: (id: string, content: string) => void;
  onRemove: (id: string) => void;
}

type CustomNode = Node<ChartNodeData> | Node<TextBoxNodeData>;

interface FlowBoardProps {
  charts: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    graphUrl: string;
    position: { x: number; y: number; width?: number; height?: number; };
  }>;
  textBoxes: Array<{
    id: string;
    type: 'textbox';
    content: string;
    position: { x: number; y: number };
  }>;
  onChartPositionChange: (id: string, position: { x: number; y: number }) => void;
  onChartRemove: (id: string) => void;
  onChartMaximize: (id: string) => void;
  onChartDescriptionChange: (id: string, description: string) => void;
  onTextBoxPositionChange: (id: string, position: { x: number; y: number }) => void;
  onTextBoxContentChange: (id: string, content: string) => void;
  onTextBoxRemove: (id: string) => void;
  maximizedChart: string | null;
  onAreaClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}


// Custom node component that directly renders the chart content
// Update the ChartNode component with proper typing
const ChartNode: React.FC<NodeProps<ChartNodeData>> = ({ data }) => {
  const { theme } = useTheme();
  const width = data.position?.width || 800;
  const height = data.position?.height || 600;

  return (
    <Card 
      className="shadow-lg transition-colors duration-200"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: theme.nodeBackground,
        color: theme.text,
        boxShadow: theme.nodeShadow,
        borderColor: theme.border
      }}
    >
      <CardHeader className="cursor-move p-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{data.title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-opacity-10"
              style={{ color: theme.text, backgroundColor: 'transparent' }}
              onClick={() => data.onDescriptionChange(data.id, data.description || '')}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-opacity-10"
              style={{ color: theme.text, backgroundColor: 'transparent' }}
              onClick={() => data.onMaximizeToggle(data.id)}
            >
              {data.isMaximized ? 
                <Minimize2 className="h-4 w-4" /> : 
                <Maximize2 className="h-4 w-4" />
              }
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-opacity-10"
              style={{ color: theme.text, backgroundColor: 'transparent' }}
              onClick={() => data.onRemove(data.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {data.description && (
          <p className="text-sm" style={{ color: theme.secondary }}>{data.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-90px)]">
        <iframe
          src={data.graphUrl}
          className="w-full h-full rounded-b-lg"
          style={{ backgroundColor: theme.background }}
          title={data.title}
        />
      </CardContent>
    </Card>
  );
};

const nodeTypes: NodeTypes = {
  chartNode: ChartNode,
  textBoxNode:TextBoxNode,
};

const FlowBoard: React.FC<FlowBoardProps> = ({
  charts,
  textBoxes,
  onChartPositionChange,
  onChartRemove,
  onChartMaximize,
  onChartDescriptionChange,
  onTextBoxPositionChange,
  onTextBoxContentChange,
  onTextBoxRemove,
  maximizedChart,
  onAreaClick,
}) => {
    const {theme} = useTheme();
  // Convert charts to React Flow nodes
// Update the createNodes function with better typing
const createNodes = useCallback((): FlowNode[] => {
  // Create chart nodes with the new typing
  const chartNodes: FlowNode[] = charts.map((chart) => ({
    id: chart.id,
    type: 'chartNode',
    position: chart.position,
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
    },
    draggable: maximizedChart !== chart.id,
  }));

  // Create textbox nodes with the new typing
  const textBoxNodes: FlowNode[] = textBoxes.map((textBox) => ({
    id: textBox.id,
    type: 'textBoxNode',
    position: textBox.position,
    data: {
      id: textBox.id,
      nodeType: 'textbox',
      position: textBox.position,
      content: textBox.content,
      onRemove: onTextBoxRemove,
      onContentChange: onTextBoxContentChange,
    },
    draggable: true,
  }));

  return [...chartNodes, ...textBoxNodes];
}, [
  charts,
  textBoxes,
  maximizedChart,
  onChartRemove,
  onChartMaximize,
  onChartDescriptionChange,
  onTextBoxContentChange,
  onTextBoxRemove
]);

  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(createNodes());
  }, [charts, textBoxes, createNodes, setNodes]);

  
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    const position = { x: node.position.x, y: node.position.y };
    
    // Use type assertion to safely handle different node types
    const nodeData = node.data as (ChartNodeData | TextBoxNodeData);
    
    if (nodeData.type === 'textbox') {
      onTextBoxPositionChange(node.id, position);
    } else {
      onChartPositionChange(node.id, position);
    }
  }, [onChartPositionChange, onTextBoxPositionChange]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full transition-colors duration-200"
           style={{ backgroundColor: theme.background }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onClick={(event: React.MouseEvent) => {
            if (!(event.target as HTMLElement).closest('.react-flow__node')) {
              onAreaClick(event as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
          fitView
          minZoom={0.1}
          maxZoom={2}
          snapToGrid
          snapGrid={[16, 16]}
          style={{ backgroundColor: theme.background }}
        >
          <Background 
            color={theme.backgroundDots}
            gap={16} 
            size={1}
            // variant="dots"
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