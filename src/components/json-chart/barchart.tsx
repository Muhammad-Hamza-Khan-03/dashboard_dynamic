// components/BarChart.js
"use client"
import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { data } from './graph'
const BarChart = () => {
  const [chartData, setChartData] = useState(null);

  setChartData(data);
  // useEffect(() => {
  //   // Fetch the JSON data from the public folder
  //   fetch('/graph.json')
  //     .then(response => response.json())
  //     .then(data => setChartData(data))
  //     .catch(error => console.error('Error fetching chart data:', error));
  // }, []);

  if (!chartData) {
    // Optionally render a loading state
    return <div>Loading chart...</div>;
  }

  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      style={{ width: "100%", height: "100%" }}
      config={{ responsive: true }}
    />
  );
};

export default BarChart;
