import React, { useState } from 'react';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, AreaChart, Area, ComposedChart
} from 'recharts';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const SavedChartModal: React.FC<SavedChartModalProps> = ({ chart, onClose }) => {
    const [usePlotly, setUsePlotly] = useState(true);

    const renderPlotlyChart = () => {
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
            case "box":
                dataKeys.forEach(key => {
                    plotData.push({
                        y: chart.data.map(item => item[key]),
                        type: 'box',
                        name: key,
                    });
                });
                break;
            case "scatter":
                plotData.push({
                    x: chart.data.map(item => item[dataKeys[0]]),
                    y: chart.data.map(item => item[dataKeys[1]]),
                    mode: 'markers',
                    type: 'scatter',
                    marker: { size: 8 },
                });
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
                break;
            default:
                return <div>Unsupported chart type</div>;
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

    const renderRechartsChart = () => {
        const xAxisKey = chart.columns[0];
        const dataKeys = chart.columns.slice(1);

        switch (chart.type) {
            case "line":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "pie":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={chart.data}
                                dataKey={dataKeys[0]}
                                nameKey={xAxisKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={150}
                                fill="#8884d8"
                                label
                            >
                                {chart.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case "box":
                // Recharts doesn't have a built-in box plot, so we'll use a custom implementation
                return <div>Box plot not supported in Recharts</div>;
            case "scatter":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart>
                            <CartesianGrid />
                            <XAxis dataKey={dataKeys[0]} name={dataKeys[0]} />
                            <YAxis dataKey={dataKeys[1]} name={dataKeys[1]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Data" data={chart.data} fill="#8884d8" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case "segmented":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case "segmented-bar":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "histogram":
                // Recharts doesn't have a built-in histogram, so we'll use a bar chart as an approximation
                const histogramData = calculateHistogram(chart.data, dataKeys[0]);
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={histogramData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bin" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="frequency" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            default:
                return <div>Unsupported chart type</div>;
        }
    };

    const calculateHistogram = (data: any[], key: string) => {
        const values = data.map(item => item[key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const binCount = 10;
        const binSize = range / binCount;

        const bins = Array.from({ length: binCount }, (_, i) => ({
            bin: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
            frequency: 0
        }));

        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            bins[binIndex].frequency++;
        });

        return bins;
    };

    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center'>
            <div className='w-4/5 h-4/5 bg-white rounded-lg p-6 flex flex-col relative shadow-lg'>
                <button className='absolute top-3 right-3 text-2xl text-gray-600 hover:text-gray-900' onClick={onClose}>
                    <X />
                </button>
                <h2 className='text-2xl font-bold mb-4'>{chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart</h2>
                <div className="flex items-center space-x-2 mb-4">
                    <Switch
                        id="chart-library"
                        checked={usePlotly}
                        onCheckedChange={setUsePlotly}
                    />
                    <Label htmlFor="chart-library">
                        {usePlotly ? 'Using Plotly' : 'Using Recharts'}
                    </Label>
                </div>
                <div className='flex-grow'>
                    {usePlotly ? renderPlotlyChart() : renderRechartsChart()}
                </div>
            </div>
        </div>
    );
};

export default SavedChartModal;