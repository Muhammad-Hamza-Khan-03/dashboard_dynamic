import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { X } from 'lucide-react';

interface SavedChartModalProps {
    chart: {
        type: string;
        data: any[];
        columns: string[];
    };
    onClose: () => void;
}


const SavedChartModal: React.FC<SavedChartModalProps> = ({ chart, onClose }) => {
    const vibrantColors = [
        "#FF6B6B", // Bright Red
        "#4ECDC4", // Turquoise
        "#45B7D1", // Sky Blue
        "#FFA07A", // Light Salmon
        "#98D8C8", // Mint
        "#F7DC6F", // Yellow
        "#D98880", // Light Coral
        "#A569BD", // Light Purple
        "#5DADE2", // Bright Blue
        "#45B39D", // Sea Green
        "#EC7063", // Pastel Red
        "#5499C7", // Steel Blue
        "#52BE80", // Nephritis
        "#EB984E", // Dark Orange
        "#AF7AC5"  // Amethyst
    ];
    const renderChart = () => {
        const xAxisKey = chart.columns[0];
        const dataKeys = chart.columns.slice(1);

        const commonProps = {
            margin: { top: 20, right: 30, left: 50, bottom: 50 },
        };

        switch (chart.type) {
            case "line":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chart.data} {...commonProps}>
                            {dataKeys.map((key, index) => (
                                <Line 
                                    key={key} 
                                    type="monotone" 
                                    dataKey={key} 
                                    stroke={vibrantColors[index % vibrantColors.length]} 
                                    strokeWidth={2}
                                />
                            ))}
                            <CartesianGrid stroke="#ccc" />
                            <XAxis 
                                dataKey={xAxisKey} 
                                label={{ value: xAxisKey, position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis 
                                label={{ value: dataKeys.join(', '), angle: -90, position: 'insideLeft', offset: 20 }}
                            />
                            <Tooltip />
                            <Legend />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chart.data} {...commonProps}>
                            {dataKeys.map((key, index) => (
                                <Bar 
                                    key={key} 
                                    dataKey={key} 
                                    fill={vibrantColors[index % vibrantColors.length]}
                                />
                            ))}
                            <CartesianGrid stroke="#ccc" />
                            <XAxis 
                                dataKey={xAxisKey} 
                                label={{ value: xAxisKey, position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis 
                                label={{ value: dataKeys.join(', '), angle: -90, position: 'insideLeft', offset: 20 }}
                            />
                            <Tooltip />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "pie":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart {...commonProps}>
                            <Pie 
                                data={chart.data} 
                                dataKey={dataKeys[0]} 
                                nameKey={xAxisKey} 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={100} 
                                label
                            >
                                {chart.data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={vibrantColors[index % vibrantColors.length]} 
                                    />
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
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center'>
            <div className='w-4/5 h-4/5 bg-white rounded-lg p-6 flex flex-col relative shadow-lg'>
                <button className='absolute top-3 right-3 text-2xl text-gray-600 hover:text-gray-900' onClick={onClose}>
                    <X />
                </button>
                <h2 className='text-2xl font-bold mb-4'>{chart.type} Chart</h2>
                <div className='flex-grow'>
                    {renderChart()}
                </div>
            </div>
        </div>
    );
};

export default SavedChartModal;