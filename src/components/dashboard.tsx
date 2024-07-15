"use client"
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataItem = Record<string, string | number>;

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/get-csv-data');
        const fetchedData = await response.json();
        // Convert string numbers to actual numbers
        const processedData = fetchedData.map((item: DataItem) => {
          const processed: DataItem = {};
          Object.entries(item).forEach(([key, value]) => {
            processed[key] = isNaN(Number(value)) ? value : Number(value);
          });
          return processed;
        });
        setData(processedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (data.length === 0) return <div className="text-center mt-10">No data available</div>;

  const headers = Object.keys(data[0]);
  const numericColumns = headers.filter(header => typeof data[0][header] === 'number');
  const firstColumn = headers[0];

  const getColumnSum = (column: string) => data.reduce((sum, row) => sum + (typeof row[column] === 'number' ? row[column] as number : 0), 0);
  const getColumnAverage = (column: string) => getColumnSum(column) / data.length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {numericColumns.slice(0, 4).map(column => (
          <Card key={column}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{column}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getColumnAverage(column).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Average</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Bar Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={firstColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((column, index) => (
                <Bar key={column} dataKey={column} fill={`hsl(${index * 120}, 70%, 50%)`} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Line Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={firstColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((column, index) => (
                <Line key={column} type="monotone" dataKey={column} stroke={`hsl(${index * 120}, 70%, 50%)`} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;