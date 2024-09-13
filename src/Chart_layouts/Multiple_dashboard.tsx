"use client"
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
  isNumeric: boolean;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const MultiDashboardPage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoricalColumn, setSelectedCategoricalColumn] = useState<string>('');

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

      const processedData = fetchedData.map((item: DataItem) => {
        const processedItem: DataItem = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (typeof value === 'string' && !isNaN(Number(value))) {
            processedItem[key] = parseFloat(value);
          } else {
            processedItem[key] = value;
          }
        });
        return processedItem;
      });

      setData(processedData);

      if (processedData.length > 0) {
        const generatedColumns: Column[] = Object.keys(processedData[0]).map((key) => ({
          accessorKey: key,
          header: key,
          isNumeric: typeof processedData[0][key] === 'number'
        }));
        setColumns(generatedColumns);

        const firstCategoricalColumn = generatedColumns.find(col => !col.isNumeric);
        if (firstCategoricalColumn) {
          setSelectedCategoricalColumn(firstCategoricalColumn.accessorKey);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getNumericColumns = () => columns.filter(col => col.isNumeric);
  const getCategoricalColumns = () => columns.filter(col => !col.isNumeric);

  const calculateAverage = (column: string) => {
    const validValues = data.map(item => item[column]).filter(value => !isNaN(value));
    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  };

  const getCategoricalData = () => {
    const categoryCounts: { [key: string]: number } = {};
    data.forEach(item => {
      const category = item[selectedCategoricalColumn];
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
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
          <CardTitle>Categorical Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {getCategoricalColumns().length > 0 ? (
            <>
              <select
                value={selectedCategoricalColumn}
                onChange={(e) => setSelectedCategoricalColumn(e.target.value)}
                className="mb-2 p-2 border rounded"
              >
                {getCategoricalColumns().map(column => (
                  <option key={column.accessorKey} value={column.accessorKey}>
                    {column.header}
                  </option>
                ))}
              </select>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={getCategoricalData()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {getCategoricalData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p>No categorical data available for chart</p>
          )}
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
              const growthRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Data Dashboard</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin mr-2" />
          Loading data...
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">
              <TrendingUp className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="trends">
              <BarChartIcon className="mr-2 h-4 w-4" /> Trends
            </TabsTrigger>
            <TabsTrigger value="insights">
              <PieChartIcon className="mr-2 h-4 w-4" /> Insights
            </TabsTrigger>
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
      )}
    </div>
  );
};

export default MultiDashboardPage;