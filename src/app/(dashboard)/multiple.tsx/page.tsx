import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpDown, BarChartIcon, PieChartIcon, TrendingUp, Loader2 } from 'lucide-react';

type DataItem = {
  [key: string]: any;
};

type Column = {
  accessorKey: string;
  header: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const MultiDashboardPage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/get-csv-data");
      if (!response.ok) throw new Error("Failed to fetch data");
      const fetchedData = await response.json();
      setData(fetchedData);
      
      if (fetchedData.length > 0) {
        const generatedColumns: Column[] = Object.keys(fetchedData[0]).map((key) => ({
          accessorKey: key,
          header: key,
        }));
        setColumns(generatedColumns);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getNumericColumns = () => columns.filter(col => typeof data[0]?.[col.accessorKey] === 'number');

  const calculateAverage = (column: string) => {
    return data.reduce((sum, item) => sum + item[column], 0) / data.length;
  };

  const Overview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total Records: {data.length}</p>
          {getNumericColumns().slice(0, 3).map(column => (
            <p key={column.accessorKey}>
              Average {column.header}: {calculateAverage(column.accessorKey).toFixed(2)}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Distribution Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {getNumericColumns().length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.slice(0, 5)}
                  dataKey={getNumericColumns()[0]?.accessorKey}
                  nameKey={columns[0]?.accessorKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {data.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No numeric data available for chart</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {columns.slice(0, 5).map((column) => (
              <li key={column.accessorKey} className="mb-2">
                <strong>{column.header}:</strong> {data[0]?.[column.accessorKey]}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const Trends = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          {getNumericColumns().length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={columns[0]?.accessorKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {getNumericColumns().slice(0, 3).map((column, index) => (
                  <Bar key={column.accessorKey} dataKey={column.accessorKey} fill={COLORS[index]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No numeric data available for chart</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top Values</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {getNumericColumns().slice(0, 3).map(column => {
              const maxValue = Math.max(...data.map(item => item[column.accessorKey]));
              return (
                <li key={column.accessorKey} className="mb-2">
                  <strong>{column.header}:</strong> {maxValue}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Growth Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {getNumericColumns().slice(0, 3).map(column => {
              const firstValue = data[0]?.[column.accessorKey] || 0;
              const lastValue = data[data.length - 1]?.[column.accessorKey] || 0;
              const growthRate = ((lastValue - firstValue) / firstValue) * 100;
              return (
                <li key={column.accessorKey} className="mb-2">
                  <strong>{column.header}:</strong> {growthRate.toFixed(2)}%
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const Insights = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Range</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {getNumericColumns().slice(0, 4).map(column => {
              const values = data.map(item => item[column.accessorKey]);
              const min = Math.min(...values);
              const max = Math.max(...values);
              return (
                <li key={column.accessorKey} className="mb-2">
                  <strong>{column.header}:</strong> {min} - {max}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Correlation Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Placeholder for correlation analysis</p>
          {/* Implement correlation analysis here */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {columns.slice(0, 4).map(column => {
              const nonNullCount = data.filter(item => item[column.accessorKey] != null).length;
              const completeness = (nonNullCount / data.length) * 100;
              return (
                <li key={column.accessorKey} className="mb-2">
                  <strong>{column.header}:</strong> {completeness.toFixed(2)}% complete
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="mr-2 h-16 w-16 animate-spin" />
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchData} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There is no data to display. Please upload a CSV file or check your data source.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-screen-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Multi-Dashboard Overview</h1>
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview"><BarChartIcon className="mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="trends"><TrendingUp className="mr-2" />Trends</TabsTrigger>
          <TabsTrigger value="insights"><PieChartIcon className="mr-2" />Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="trends">
          <Trends />
        </TabsContent>
        <TabsContent value="insights">
          <Insights />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiDashboardPage;