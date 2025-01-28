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

interface FlowBoardProps {
  charts: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    graphUrl: string;
    position: { x: number; y: number; width?: number; height?: number; };
  }>;
  onChartPositionChange: (id: string, position: { x: number; y: number }) => void;
  onChartRemove: (id: string) => void;
  onChartMaximize: (id: string) => void;
  onChartDescriptionChange: (id: string, description: string) => void;
  maximizedChart: string | null;
  onAreaDoubleClick: (event: React.MouseEvent) => void;
}

// Custom node component that directly renders the chart content
const ChartNode: React.FC<NodeProps> = ({ data }) => {
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
};

const FlowBoard: React.FC<FlowBoardProps> = ({
    charts,
    onChartPositionChange,
    onChartRemove,
    onChartMaximize,
    onChartDescriptionChange,
    maximizedChart,
    onAreaDoubleClick,
}) => {
    const {theme} = useTheme();
  // Convert charts to React Flow nodes
  const createNodes = useCallback((charts: FlowBoardProps['charts']) => {
    return charts.map((chart) => ({
      id: chart.id,
      type: 'chartNode',
      position: { x: chart.position.x, y: chart.position.y },
      data: {
        ...chart,
        onRemove: onChartRemove,
        isMaximized: maximizedChart === chart.id,
        onMaximizeToggle: onChartMaximize,
        onDescriptionChange: onChartDescriptionChange,
      },
      // Disable dragging if the chart is maximized
      draggable: maximizedChart !== chart.id,
    }));
  }, [maximizedChart, onChartRemove, onChartMaximize, onChartDescriptionChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes(charts));
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when charts change
  useEffect(() => {
    setNodes(createNodes(charts));
  }, [charts, createNodes, setNodes]);

  
  // Handle node drag
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    onChartPositionChange(node.id, node.position);
  }, [onChartPositionChange]);

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
          onDoubleClick={onAreaDoubleClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
          snapToGrid
          snapGrid={[16, 16]}
          style={{ backgroundColor: theme.background }}
          onClick={(e) => {
            // Prevent triggering click when interacting with nodes
            if ((e.target as HTMLElement).closest('.react-flow__node')) {
              return;
            }
            onAreaDoubleClick(e);
          }}
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