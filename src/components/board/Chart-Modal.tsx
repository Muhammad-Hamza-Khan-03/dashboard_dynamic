"use client";
import { useEffect, useState } from 'react';
import Modal from "./modal";
import { sidebarData } from "./Chart-data";
import { useModalStore } from '@/features/chart-modal/hooks/useChartModal';

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

    const renderChart = () => {
        if (loading) return <div>Loading...</div>;
        if (error) return <div>Error: {error}</div>;
        if (data.length === 0) return <div>No data available</div>;

        const numericColumns = columns.filter(col => col.isNumeric);
        if (numericColumns.length === 0) return <div>No numeric data available for charting</div>;

        const xAxisKey = columns[0].accessorKey; // Assuming the first column is suitable for x-axis
        const dataKey = numericColumns[0].accessorKey; // Using the first numeric column for y-axis

        const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        switch (chartType) {
            case "line":
                return (
                    <LineChart data={data}>
                        <Line type="monotone" dataKey={dataKey} stroke="#ca3a12" />
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                    </LineChart>
                );
            case "bar":
                return (
                    <BarChart data={data}>
                        <Bar dataKey={dataKey} fill="#ca3a12" />
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                    </BarChart>
                );
            case "pie":
                return (
                    <PieChart>
                        <Pie data={data} dataKey={dataKey} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={100} fill="#ca3a12">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getRandomColor()} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            case "scatter":
                return (
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis dataKey={xAxisKey} type="number" />
                        <YAxis dataKey={dataKey} type="number" />
                        <Scatter name={dataKey} data={data} fill="#ca3a12" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                    </ScatterChart>
                );
            case "area":
                return (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey={dataKey} stroke="#ca3a12" fill="#ca3a12" fillOpacity={0.3} />
                        <Legend />
                    </AreaChart>
                );
            case "radar":
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey={xAxisKey} />
                        <PolarRadiusAxis />
                        <Radar name={dataKey} dataKey={dataKey} stroke="#ca3a12" fill="#ca3a12" fillOpacity={0.6} />
                        <Legend />
                    </RadarChart>
                );
            default:
                return (
                    <LineChart data={data}>
                        <Line type="monotone" dataKey={dataKey} stroke="#ca3a12" />
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
            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg" onClick={openModal}>
                Show Chart Modal
            </button>
            <Modal
                isOpen={showModal}
                onDismiss={closeModal}
                
                sidebarColumns={columns.map(col => col.header)}
                chartType={chartType}
                onChartTypeChange={handleChartTypeChange}
            >
                <div className="my-4 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </Modal>
        </div>
    );
}

export default ChartModal;