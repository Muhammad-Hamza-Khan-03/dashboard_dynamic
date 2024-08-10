import React from 'react';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface SavedChartModalProps {
    chart: {
        type: string;
        data: any[];
        columns: string[];
    };
    onClose: () => void;
}

const SavedChartModal: React.FC<SavedChartModalProps> = ({ chart, onClose }) => {
    const renderChart = () => {
        const xAxisKey = chart.columns[0];
        const dataKeys = chart.columns.slice(1);

        const plotData: any[] = [];
        const layout: any = {
            title: `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`,
            xaxis: { title: xAxisKey },
            yaxis: { title: dataKeys.join(', ') },
            autosize: true,
        };

        switch (chart.type) {
            case "line":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: chart.data.map(item => item[xAxisKey]),
                        y: chart.data.map(item => item[key]),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: key,
                    });
                });
                break;
            case "bar":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: chart.data.map(item => item[xAxisKey]),
                        y: chart.data.map(item => item[key]),
                        type: 'bar',
                        name: key,
                    });
                });
                break;
            case "pie":
                plotData.push({
                    labels: chart.data.map(item => item[xAxisKey]),
                    values: chart.data.map(item => item[dataKeys[0]]),
                    type: 'pie',
                });
                layout.yaxis = {}; // Remove y-axis for pie chart
                break;
            case "segmented":
                dataKeys.forEach(key => {
                    plotData.push({
                        x: chart.data.map(item => item[xAxisKey]),
                        y: chart.data.map(item => item[key]),
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
                        x: chart.data.map(item => item[xAxisKey]),
                        y: chart.data.map(item => item[key]),
                        type: 'bar',
                        name: key,
                    });
                });
                layout.barmode = 'stack';
                break;
            case "histogram":
                plotData.push({
                    x: chart.data.map(item => item[dataKeys[0]]),
                    type: 'histogram',
                });
                layout.xaxis.title = dataKeys[0];
                layout.yaxis.title = 'Frequency';
                break;
            case "scatter":
                plotData.push({
                    x: chart.data.map(item => item[dataKeys[0]]),
                    y: chart.data.map(item => item[dataKeys[1]]),
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
                        y: chart.data.map(item => item[key]),
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
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center'>
            <div className='w-4/5 h-4/5 bg-white rounded-lg p-6 flex flex-col relative shadow-lg'>
                <button className='absolute top-3 right-3 text-2xl text-gray-600 hover:text-gray-900' onClick={onClose}>
                    <X />
                </button>
                <h2 className='text-2xl font-bold mb-4'>{chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart</h2>
                <div className='flex-grow'>
                    {renderChart()}
                </div>
            </div>
        </div>
    );
};

export default SavedChartModal;