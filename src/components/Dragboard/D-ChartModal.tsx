"use client";
import React, { useState } from 'react';
import Drag_Modal from "./D-Modal";
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
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Chart type options
const chartTypes = [
    { type: 'line', icon: LineChartIcon, label: 'Line' },
    { type: 'bar', icon: BarChartIcon, label: 'Bar' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie' },
];

// Sample columns (replace with your actual columns)
const columns = [
    { id: 'month', label: 'Month' },
    { id: 'expense', label: 'Expense' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'profit', label: 'Profit' },
];

// Sample data (replace with your actual data)
const sampleData = [
    { month: 'Jan', expense: 1000, revenue: 1500, profit: 500 },
    { month: 'Feb', expense: 1200, revenue: 1800, profit: 600 },
    { month: 'Mar', expense: 900, revenue: 1700, profit: 800 },
    // Add more sample data as needed
];

const DragChartModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chartType, setChartType] = useState("line");
    const [xAxis, setXAxis] = useState('month');
    const [yAxis, setYAxis] = useState('expense');

    const openModal = () => {
        console.log("Modal Opened");
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleChartTypeChange = (type: React.SetStateAction<string>) => setChartType(type);

    const handleColumnClick = (columnId: React.SetStateAction<string>) => {
        if (columnId === xAxis) {
            setXAxis('');
        } else if (columnId === yAxis) {
            setYAxis('');
        } else if (!xAxis) {
            setXAxis(columnId);
        } else if (!yAxis) {
            setYAxis(columnId);
        }
    };

    const renderChart = () => {
        const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : PieChart;

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ChartComponent data={sampleData}>
                    {chartType !== 'pie' && (
                        <>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxis} />
                            <YAxis />
                            <Tooltip />
                        </>
                    )}
                    {chartType === 'line' && <Line type="monotone" dataKey={yAxis} stroke="#8884d8" />}
                    {chartType === 'bar' && <Bar dataKey={yAxis} fill="#8884d8" />}
                    {chartType === 'pie' && (
                        <Pie data={sampleData} dataKey={yAxis} nameKey={xAxis} cx="50%" cy="50%" outerRadius={80} label>
                            {sampleData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${index * 30}, 70%, 50%)`} />
                            ))}
                        </Pie>
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        );
    };
const Column = ({ column }:any) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: column.id,
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition: transform ? 'transform 0.2s ease' : undefined, // Optional: Add smooth transition for when dragging stops
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`bg-white p-2 mb-2 rounded shadow cursor-pointer ${
                column.id === xAxis || column.id === yAxis ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleColumnClick(column.id)}
        >
            {column.label}
        </div>
    );
};

    type dropcontainer = {
        id: number,
        children?:React.ReactNode
}
    const DroppableContainer = ({ id, children }:dropcontainer) => {
        const { isOver, setNodeRef } = useDroppable({
            id: id.toString(), // Ensure id is a string
        });

        const style = {
            backgroundColor: isOver ? 'lightblue' : 'white',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            minHeight: '40px',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        };

        return (
            <div ref={setNodeRef} style={style}>
                {children}
            </div>
        );
    };

    const handleDragEnd = (event:any) => {
        const { active, over } = event;
        if (!over) return;

        if (over.id === '1') { // x-axis
            setXAxis(active.id);
        } else if (over.id === '2') { // y-axis
            setYAxis(active.id);
        }
    };

    return (
        <div>
            <Button onClick={openModal}>Dragable Chart</Button>
            <Drag_Modal
                isOpen={isModalOpen}
                onDismiss={closeModal}
               
            >
                <div className="flex h-full">
                    <DndContext onDragEnd={handleDragEnd}>
                        <div className="w-1/4 p-4 bg-gray-100 flex flex-col">
                            <h3 className="font-bold mb-4">Chart Type</h3>
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {chartTypes.map(({ type, icon: Icon, label }) => (
                                    <Card
                                        key={type}
                                        className={`cursor-pointer transition-all ${chartType === type ? 'ring-2 ring-blue-500' : ''}`}
                                        onClick={() => handleChartTypeChange(type)}
                                    >
                                        <CardContent className="flex flex-col items-center justify-center p-2">
                                            <Icon className="h-6 w-6 mb-1" />
                                            <span className="text-xs">{label}</span>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <h3 className="font-bold mb-2">Columns</h3>
                            <SortableContext items={columns.map(column => column.id)} strategy={verticalListSortingStrategy}>
                                {columns.map(column => (
                                    <Column key={column.id} column={column} />
                                ))}
                            </SortableContext>
                            <div className="mt-auto">
                                <h3 className="font-bold mb-2">Axes</h3>
                                <DroppableContainer id={1}>
                                    X-Axis: {xAxis || 'Drop here'}
                                </DroppableContainer>
                                <DroppableContainer id={2}>
                                    Y-Axis: {yAxis || 'Drop here'}
                                </DroppableContainer>
                            </div>
                        </div>
                        <div className="w-3/4 p-4">
                            {renderChart()}
                        </div>
                    </DndContext>
                </div>
            </Drag_Modal>
        </div>
    );
};

export default DragChartModal;
