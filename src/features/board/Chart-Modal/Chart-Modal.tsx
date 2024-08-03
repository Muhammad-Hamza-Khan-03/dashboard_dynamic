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
}

const ChartModal: React.FC<ChartModalProps> = ({ data, columns, selectedColumns, setSelectedColumns }) => {
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

    const chartColor = "#ca3a12"; // Define a single color for all charts

    const renderChart = () => {
        if (loading) return <div className="text-center">Loading...</div>;
        if (error) return <div className="text-center text-red-600">Error: {error}</div>;
        if (data.length === 0) return <div className="text-center">No data available</div>;

        const xAxisKey = selectedColumns[0]; // Use the first selected column as x-axis
        const dataKeys = selectedColumns.slice(1); // Use the remaining columns for y-axis

        if (dataKeys.length === 0) return <div className="text-center">Select a column</div>;

        switch (chartType) {
            case "line":
                return (
                    <LineChart data={data} width={600} height={400}>
                        {dataKeys.map(key => (
                            <Line key={key} type="monotone" dataKey={key} stroke={chartColor} />
                        ))}
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                    </LineChart>
                );
            case "bar":
                return (
                    <BarChart data={data} width={600} height={400}>
                        {dataKeys.map(key => (
                            <Bar key={key} dataKey={key} fill={chartColor} />
                        ))}
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                    </BarChart>
                );
            case "pie":
                return (
                    <PieChart width={600} height={400}>
                        <Pie data={data} dataKey={dataKeys[0]} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={100} fill={chartColor}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColor} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            
            default:
                return (
                    <LineChart data={data} width={600} height={400}>
                        {dataKeys.map(key => (
                            <Line key={key} type="monotone" dataKey={key} stroke={chartColor} />
                        ))}
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
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
