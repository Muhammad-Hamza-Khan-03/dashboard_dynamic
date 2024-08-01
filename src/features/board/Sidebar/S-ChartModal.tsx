// S_ChartModal.tsx
"use client"
import React, { useState, useEffect } from 'react';
import Modal from "./S-Modal";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
} from 'recharts';
import { fetchData } from '@/features/board/api/fetchDataUtils';


interface DataItem {
    [key: string]: string | number;
}

interface Column {
    accessorKey: string;
    header: string;
    isNumeric: boolean;
}

// Chart type options
export const chartTypes = [
    { type: 'line', icon: LineChartIcon, label: 'Line Chart' },
    { type: 'bar', icon: BarChartIcon, label: 'Bar Chart' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
];

const S_ChartModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [chartType, setChartType] = useState("line");
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [data, setData] = useState<DataItem[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            const { data, columns, error } = await fetchData();
            setData(data);
            setColumns(columns);
            setError(error);
        };

        fetchDataAsync();
    }, []);

    const openModalHandler = () => setShowModal(true);
    const closeModalHandler = () => setShowModal(false);

    const handleChartTypeChange = (type: string) => setChartType(type);

    const handleColumnToggle = (column: string) => {
        setSelectedColumns(prev =>
            prev.includes(column)
                ? prev.filter(c => c !== column)
                : [...prev, column]
        );
    };

    const renderChart = () => {
        const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : PieChart;

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ChartComponent data={data}>
                    {chartType !== 'pie' && (
                        <>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={columns[0]?.accessorKey} />
                            <YAxis />
                            <Tooltip />
                        </>
                    )}
                    {selectedColumns.map((column, index) => {
                        if (chartType === 'line') {
                            return <Line key={column} type="monotone" dataKey={column} stroke={`hsl(${index * 60}, 70%, 50%)`} />;
                        } else if (chartType === 'bar') {
                            return <Bar key={column} dataKey={column} fill={`hsl(${index * 60}, 70%, 50%)`} />;
                        } else {
                            return (
                                <Pie key={column} data={data} dataKey={column} nameKey={columns[0]?.accessorKey} cx="50%" cy="50%" outerRadius={80} label>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(${index * 30}, 70%, 50%)`} />
                                    ))}
                                </Pie>
                            );
                        }
                    })}
                </ChartComponent>
            </ResponsiveContainer>
        );
    };

    if (error) {
        return <div>Error fetching data: {error}</div>;
    }

    return (
        <div>
            <Button onClick={openModalHandler}>Side Chart</Button>
            <Modal
                isOpen={showModal}
                onDismiss={closeModalHandler}
            >
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {chartTypes.map(({ type, icon: Icon, label }) => (
                        <Card
                            key={type}
                            className={`cursor-pointer transition-all ${chartType === type ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => handleChartTypeChange(type)}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <Icon className="h-12 w-12 mb-2" />
                                <span>{label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex space-x-4 mb-6">
                    {columns.map(column => (
                        <div key={column.accessorKey} className="flex items-center space-x-2">
                            <Checkbox
                                id={column.accessorKey}
                                checked={selectedColumns.includes(column.accessorKey)}
                                onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                            />
                            <label htmlFor={column.accessorKey}>{column.header}</label>
                        </div>
                    ))}
                </div>
                {renderChart()}
            </Modal>
        </div>
    );
}

export default S_ChartModal;
