"use client";
import { useEffect, useState } from 'react';
import Modal from "./modal";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    ScatterChart,
    Scatter,
    AreaChart,
    Area,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { useModalStore } from '@/features/chart-modal/hooks/useChartModal';

interface DataItem {
    [key: string]: string | number;
}

interface Column {
    accessorKey: string;
    header: string;
    isNumeric: boolean;
}

const ChartModal = () => {
    const { showModal, chartType, openModal, closeModal, setChartType } = useModalStore();
    const [data, setData] = useState<DataItem[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]); // Track selected columns
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/get-csv-data");
            if (!response.ok) throw new Error("Failed to fetch data");
            const fetchedData = await response.json();
            
            const processedData = fetchedData.map((item: DataItem) => {
                const processedItem: DataItem = {};
                Object.keys(item).forEach(key => {
                    const value = item[key];
                    if (typeof value === 'string' && !isNaN(Number(value))) {
                        processedItem[key] = parseFloat(value);
                    } else {
                        processedItem[key] = value;
                    }
                });
                return processedItem;
            });
            
            setData(processedData);
            
            if (processedData.length > 0) {
                const generatedColumns: Column[] = Object.keys(processedData[0]).map((key) => ({
                    accessorKey: key,
                    header: key,
                    isNumeric: typeof processedData[0][key] === 'number'
                }));
                setColumns(generatedColumns);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Failed to fetch data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

        if (dataKeys.length === 0) return <div className="text-center">No numeric data selected for charting</div>;

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
            case "scatter":
                return (
                    <ScatterChart width={600} height={400}>
                        <CartesianGrid />
                        <XAxis dataKey={xAxisKey} type="number" />
                        {dataKeys.map(key => (
                            <Scatter key={key} name={key} data={data} fill={chartColor} />
                        ))}
                        <YAxis type="number" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                    </ScatterChart>
                );
            case "area":
                return (
                    <AreaChart data={data} width={600} height={400}>
                        {dataKeys.map(key => (
                            <Area key={key} type="monotone" dataKey={key} stroke={chartColor} fill={chartColor} fillOpacity={0.3} />
                        ))}
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                    </AreaChart>
                );
            case "radar":
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" width={600} height={400} data={data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey={xAxisKey} />
                        <PolarRadiusAxis />
                        {dataKeys.map(key => (
                            <Radar key={key} name={key} dataKey={key} stroke={chartColor} fill={chartColor} fillOpacity={0.6} />
                        ))}
                        <Legend />
                    </RadarChart>
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
            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700" onClick={openModal}>
                Simple Chart
            </button>
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
