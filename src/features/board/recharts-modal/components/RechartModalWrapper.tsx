import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useRechartsModalStore } from '../hooks/use-recharts';

interface RechartsModalWrapperProps {
  data: any[];
  columns: any[];
  selectedColumns: string[];
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
  onExport: (chartData: any) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const RechartsModalWrapper: React.FC<RechartsModalWrapperProps> = ({ 
  data, 
  columns, 
  selectedColumns, 
    setSelectedColumns,
    onExport
}) => {
  const {isOpen,chartType,openModal,closeModal,setChartType }  = useRechartsModalStore();
  

  const handleColumnSelect = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) ? prev.filter(col => col !== column) : [...prev, column]
    );
  };

  const handleExport = () => {
    const chartData = {
      type: chartType,
      data: data,
      columns: selectedColumns,
    };
    onExport(chartData);
    closeModal();
  };

  const renderChart = () => {
    if (selectedColumns.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-xl font-semibold text-gray-700">
            {selectedColumns.length === 0
              ? "Select a column for X-axis"
              : "Select a column for Y-axis"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Choose columns from the sidebar to create your chart
          </p>
        </div>
      );
    }

    const xAxisKey = selectedColumns[0];
    const dataKeys = selectedColumns.slice(1);

    const chartData = data.map(item => {
      const newItem: any = { [xAxisKey]: item[xAxisKey] };
      dataKeys.forEach(key => {
        newItem[key] = item[key];
      });
      return newItem;
    });

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={dataKeys[0]}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <>
      <Button 
        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        onClick={openModal}
      >
        Recharts Chart
      </Button>

      {isOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center'>
          <div className='w-4/5 h-4/5 bg-white rounded-lg flex flex-col shadow-lg'>
            <div className='flex items-center justify-between p-4 border-b border-gray-200'>
              <h1 className='text-2xl font-bold'>Recharts Creator</h1>
              <div className='flex items-center'>
                              <Button onClick={handleExport}
                                  className="mr-4 bg-green-500 hover:bg-green-600 text-white" disabled={selectedColumns.length < 2}>
                                  {selectedColumns.length < 2 ? 'Select Columns to Export' : 'Export'}
                              </Button>
                <button className='text-2xl text-gray-600 hover:text-gray-900' onClick={closeModal}>
                  <X />
                </button>
              </div>
            </div>
            <div className='flex flex-1 overflow-hidden'>
              <div className='w-1/4 bg-gray-100 p-4 overflow-auto'>
                <h2 className="text-xl font-semibold mb-4">Select Data</h2>
                <div className="mb-4">
                  <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-2">Chart Type:</label>
                  <select
                    id="chartType"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="p-2 border rounded-lg w-full bg-white shadow-sm"
                  >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                  </select>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Columns</h3>
                  <ul className="space-y-1">
                    {columns.map((col, index) => (
                      <li
                        key={index}
                        className={`cursor-pointer p-2 rounded-md ${selectedColumns.includes(col.header) ? 'bg-blue-200' : 'bg-white'} hover:bg-blue-100`}
                        onClick={() => handleColumnSelect(col.header)}
                      >
                        {col.header}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className='w-3/4 p-4 flex items-center justify-center'>
                {renderChart()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RechartsModalWrapper;