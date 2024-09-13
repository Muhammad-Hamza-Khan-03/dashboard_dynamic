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

interface DataItem {
    [key: string]: string | number;
}

interface Column {
    accessorKey: string;
    header: string;
    isNumeric: boolean;
}

interface S_ChartModalProps {
    data: any[];
    columns: Column[];
    selectedColumns: string[];
    setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export const chartTypes = [
    { type: 'line', icon: LineChartIcon, label: 'Line Chart' },
    { type: 'bar', icon: BarChartIcon, label: 'Bar Chart' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
];

const S_ChartModal: React.FC<S_ChartModalProps> = ({ data, columns, selectedColumns, setSelectedColumns }) => {
    const [showModal, setShowModal] = useState(false);
    const [chartType, setChartType] = useState("line");
    const [error, setError] = useState<string | null>(null);
    const [localSelectedColumns, setLocalSelectedColumns] = useState<string[]>([]);

    useEffect(() => {
        // Initialize local state with the first column (usually the x-axis)
        if (columns.length > 0 && localSelectedColumns.length === 0) {
            setLocalSelectedColumns([columns[0].accessorKey]);
        }
    }, [columns]);

    const openModalHandler = () => setShowModal(true);
    const closeModalHandler = () => {
        setShowModal(false);
        // Update the parent component's state when closing the modal
        setSelectedColumns(localSelectedColumns);
    };

    const handleChartTypeChange = (type: string) => setChartType(type);

    const handleColumnToggle = (column: string) => {
        setLocalSelectedColumns(prev =>
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
                            <XAxis dataKey={localSelectedColumns[0]} />
                            <YAxis />
                            <Tooltip />
                        </>
                    )}
                    {localSelectedColumns.slice(1).map((column, index) => {
                        if (chartType === 'line') {
                            return <Line key={column} type="monotone" dataKey={column} stroke={`hsl(${index * 60}, 70%, 50%)`} />;
                        } else if (chartType === 'bar') {
                            return <Bar key={column} dataKey={column} fill={`hsl(${index * 60}, 70%, 50%)`} />;
                        } else {
                            return (
                                <Pie key={column} data={data} dataKey={column} nameKey={localSelectedColumns[0]} cx="50%" cy="50%" outerRadius={80} label>
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
                            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <Icon className="h-12 w-12 mb-2" />
                                <span>{label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex space-x-4 mb-6">
                    {columns.map((column) => (
                        <div key={column.accessorKey} className="flex items-center space-x-2">
                            <Checkbox
                                id={column.accessorKey}
                                checked={localSelectedColumns.includes(column.accessorKey)}
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
