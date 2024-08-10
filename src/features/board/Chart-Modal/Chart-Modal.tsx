"use client";
import { useEffect, useState } from 'react';
import Modal from "./modal";
import { useModalSheet } from '@/features/board/Chart-Modal/useChartModal-sheet';
import { Button } from '../../../components/ui/button';
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

interface ChartModalProps {
    data: any[];
    columns: any[];
    selectedColumns: string[];
    setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
    onExport: (chartData: any) => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ data, columns, selectedColumns, setSelectedColumns,onExport }) => {
    const { showModal, chartType, openModal, closeModal, setChartType } = useModalSheet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChartTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setChartType(event.target.value);
    };

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
        if (loading) return <div className="text-center">Loading...</div>;
        if (error) return <div className="text-center text-red-600">Error: {error}</div>;
        if (data.length === 0) return <div className="text-center">No data available</div>;

        const xAxisKey = selectedColumns[0]; // Use the first selected column as x-axis
        const dataKeys = selectedColumns.slice(1); // Use the remaining columns for y-axis

        if (dataKeys.length === 0) return <div className="text-center">Select a column</div>;

     
         const commonProps = {
            width: 600,
            height: 400,
            margin: { top: 20, right: 30, left: 50, bottom: 50 },
        };
        
 switch (chartType) {
            case "line":
                return (
                    <LineChart data={data} {...commonProps}>
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
                );
            case "bar":
                return (
                    <BarChart data={data} {...commonProps}>
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
                );
            case "pie":
                return (
                    <PieChart {...commonProps}>
                        <Pie 
                            data={data} 
                            dataKey={dataKeys[0]} 
                            nameKey={xAxisKey} 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={100} 
                            label
                        >
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={vibrantColors[index % vibrantColors.length]} 
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            default:
                return (
                    <LineChart data={data} {...commonProps}>
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
                );
        }
    };
    return (
        <div>
            <Button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700" onClick={openModal}>
                Simple Chart
            </Button>
            <Modal
                isOpen={showModal}
                onDismiss={closeModal}
                sidebarColumns={columns.map(col => col.header)}
                selectedColumns={selectedColumns}
                onColumnSelect={handleColumnSelect}
                chartType={chartType}
                onChartTypeChange={handleChartTypeChange}
                onExport={handleExport}
            >
                <div className="my-4 w-full h-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </Modal>
        </div>
    );
};

export default ChartModal;