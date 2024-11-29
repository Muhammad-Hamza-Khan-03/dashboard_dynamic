import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartConfig {
  id: number;
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'composed' | 'radar';
  data: Record<string, any>[];
  columns: {
    x: string;
    y: string;
  };
}

interface ChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChart: ChartConfig | null;
  chartType: ChartConfig['type'];
  setChartType: (type: ChartConfig['type']) => void;
  columns: string[];
  selectedColumns: { x: string; y: string };
  setSelectedColumns: (columns: { x: string; y: string }) => void;
  createChart: () => void;
  usePlotly: boolean;
  renderPlotlyChart: (chart: ChartConfig) => JSX.Element;
  renderRechartsChart: (chart: ChartConfig) => JSX.Element;
}

export const ChartModal: React.FC<ChartModalProps> = ({
  open,
  onOpenChange,
  selectedChart,
  chartType,
  setChartType,
  columns,
  selectedColumns,
  setSelectedColumns,
  createChart,
  usePlotly,
  renderPlotlyChart,
  renderRechartsChart
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={selectedChart ? "max-w-[90vw] max-h-[90vh] w-full h-full" : ""}>
      <DialogHeader>
        <DialogTitle>
          {selectedChart 
            ? `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
            : "Create Chart"
          }
        </DialogTitle>
      </DialogHeader>
      {selectedChart ? (
        <div className="w-full h-[calc(90vh-100px)]">
          {usePlotly ? renderPlotlyChart(selectedChart) : renderRechartsChart(selectedChart)}
        </div>
      ) : (
        <div className="space-y-4">
          <Select onValueChange={(value: ChartConfig['type']) => setChartType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="scatter">Scatter Plot</SelectItem>
              <SelectItem value="composed">Composed Chart</SelectItem>
              <SelectItem value="radar">Radar Chart</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value: string) => setSelectedColumns({ ...selectedColumns, x: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select X axis" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(column => (
                <SelectItem key={column} value={column}>{column}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value: string) => setSelectedColumns({ ...selectedColumns, y: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Y axis" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(column => (
                <SelectItem key={column} value={column}>{column}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={createChart}>Create Chart</Button>
        </div>
      )}
    </DialogContent>
  </Dialog>
);