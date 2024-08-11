"use client";
// import { useEffect, useState } from 'react';
import Modal from "./modal";
import { useModalSheet } from '@/features/board/Chart-Modal/useChartModal-sheet';
import { Button } from '../../../components/ui/button';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartModalProps {
    data: any[];
    columns: any[];
    selectedColumns: string[];
    setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
    onExport: (chartData: any) => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ data, columns, selectedColumns, setSelectedColumns, onExport }) => {
    const { showModal, chartType, openModal, closeModal, setChartType } = useModalSheet();

    const loading = false;
    const error = null;
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

    const renderChart = () => {
        if (loading) return <div className="text-center">Loading...</div>;
        if (error) return <div className="text-center text-red-600">Error: {error}</div>;
        if (data.length === 0) return <div className="text-center">No data available</div>;

        if (selectedColumns.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-700">Select a column for X-axis</p>
                    <p className="text-sm text-gray-500 mt-2">Choose a column from the sidebar to start creating your chart</p>
                </div>
            );
        }

        if (selectedColumns.length === 1) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-700">Select a column for Y-axis</p>
                    <p className="text-sm text-gray-500 mt-2">Choose another column to complete your chart</p>
                </div>
            );
        }
        const xAxisKey = selectedColumns[0];
        const dataKeys = selectedColumns.slice(1);

        const plotData: any[] = [];
        const layout: any = {
            title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
            xaxis: { title: xAxisKey },
            yaxis: { title: dataKeys.join(', ') },
            autosize: true,
        };

        switch (chartType) {
            case "line":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: data.map(item => item[xAxisKey]),
                        y: data.map(item => item[key]),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: key,
                    });
                });
                break;
            case "bar":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: data.map(item => item[xAxisKey]),
                        y: data.map(item => item[key]),
                        type: 'bar',
                        name: key,
                    });
                });
                break;
            case "pie":
                plotData.push({
                    labels: data.map(item => item[xAxisKey]),
                    values: data.map(item => item[dataKeys[0]]),
                    type: 'pie',
                });
                layout.yaxis = {}; // Remove y-axis for pie chart
                break;
            case "segmented":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: data.map(item => item[xAxisKey]),
                        y: data.map(item => item[key]),
                        type: 'scatter',
                        mode: 'none',
                        fill: 'tonexty',
                        name: key,
                    });
                });
                break;
            case "segmented-bar":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: data.map(item => item[xAxisKey]),
                        y: data.map(item => item[key]),
                        type: 'bar',
                        name: key,
                    });
                });
                layout.barmode = 'stack';
                break;
            case "histogram":
                plotData.push({
                    x: data.map(item => item[dataKeys[0]]),
                    type: 'histogram',
                });
                layout.xaxis.title = dataKeys[0];
                layout.yaxis.title = 'Frequency';
                break;
            case "scatter":
                plotData.push({
                    x: data.map(item => item[dataKeys[0]]),
                    y: data.map(item => item[dataKeys[1]]),
                    mode: 'markers',
                    type: 'scatter',
                    marker: { size: 8 },
                });
                layout.xaxis.title = dataKeys[0];
                layout.yaxis.title = dataKeys[1];
                break;
            case "box":
                dataKeys.forEach(key => {
                    plotData.push({
                        y: data.map(item => item[key]),
                        type: 'box',
                        name: key,
                    });
                });
                layout.xaxis.title = '';
                break;
            default:
                return <div className="text-center">Unsupported chart type</div>;
        }

        return (
            <Plot
                data={plotData}
                layout={layout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
            />
        );
    };

    return (
        <>
            <Button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700" onClick={openModal}>
                Simple Chart
            </Button>
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Modal
                        isOpen={showModal}
                        onDismiss={closeModal}
                        title="Chart Creator"
                        sidebarColumns={columns.map(col => col.header)}
                        selectedColumns={selectedColumns}
                        onColumnSelect={handleColumnSelect}
                        chartType={chartType}
                        onChartTypeChange={handleChartTypeChange}
                        onExport={handleExport}
                    >
                        <div className="w-full h-full">
                            {renderChart()}
                        </div>
                    </Modal>
                </div>
            )}
        </>
    );
};

export default ChartModal;