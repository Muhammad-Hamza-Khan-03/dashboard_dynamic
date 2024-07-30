"use client"
import React, { useState } from 'react';
import Modal from "./S-Modal";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const columns = [
    { name: 'month', label: 'Month' },
    { name: 'expense', label: 'Expense' },
    { name: 'revenue', label: 'Revenue' },
    { name: 'profit', label: 'Profit' },
];

// Sample data (replace with your actual data)
export const sampleData = [
    { month: 'Jan', expense: 1000, revenue: 1500, profit: 500 },
    { month: 'Feb', expense: 1200, revenue: 1800, profit: 600 },
    { month: 'Mar', expense: 900, revenue: 1700, profit: 800 },
    // Add more sample data as needed
];

// Chart type options
export const chartTypes = [
    { type: 'line', icon: LineChartIcon, label: 'Line Chart' },
    { type: 'bar', icon: BarChartIcon, label: 'Bar Chart' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
];

const S_ChartModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [chartType, setChartType] = useState("line");
    const [selectedColumns, setSelectedColumns] = useState(['expense']);

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
                <ChartComponent data={sampleData}>
                    {chartType !== 'pie' && (
                        <>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
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
                                <Pie key={column} data={sampleData} dataKey={column} nameKey="month" cx="50%" cy="50%" outerRadius={80} label>
                                    {sampleData.map((entry, index) => (
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
                        <div key={column.name} className="flex items-center space-x-2">
                            <Checkbox 
                                id={column.name}
                                checked={selectedColumns.includes(column.name)}
                                onCheckedChange={() => handleColumnToggle(column.name)}
                            />
                            <label htmlFor={column.name}>{column.label}</label>
                        </div>
                    ))}
                </div>
                {renderChart()}
            </Modal>
        </div>
    );
}

export default S_ChartModal;