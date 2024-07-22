"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LineChart, Line } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Grid, List, BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';

type DataItem = {
  [key: string]: any;
};

type Column = {
  accessorKey: string;
  header: string;
  isNumeric: boolean;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const OverviewDashboard: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [selectedDataKey, setSelectedDataKey] = useState<string>('');
  const [categoricalKey, setCategoricalKey] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (columns.length > 0) {
      const firstNumericColumn = columns.find(col => col.isNumeric);
      const firstCategoricalColumn = columns.find(col => !col.isNumeric);
      if (firstNumericColumn && !selectedDataKey) {
        setSelectedDataKey(firstNumericColumn.accessorKey);
      }
      if (firstCategoricalColumn && !categoricalKey) {
        setCategoricalKey(firstCategoricalColumn.accessorKey);
      }
    }
  }, [columns]);

  const fetchData = async () => {
    try {
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
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const GridLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Dynamic Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <Button
                onClick={() => setSelectedChartType('bar')}
                variant={selectedChartType === 'bar' ? 'default' : 'outline'}
                className="mr-2"
              >
                <BarChartIcon className="mr-2 h-4 w-4" /> Bar
              </Button>
              <Button
                onClick={() => setSelectedChartType('line')}
                variant={selectedChartType === 'line' ? 'default' : 'outline'}
                className="mr-2"
              >
                <LineChart className="mr-2 h-4 w-4" /> Line
              </Button>
              <Button
                onClick={() => setSelectedChartType('pie')}
                variant={selectedChartType === 'pie' ? 'default' : 'outline'}
              >
                <PieChartIcon className="mr-2 h-4 w-4" /> Pie
              </Button>
            </div>
            <div>
              <select
                value={selectedDataKey}
                onChange={(e) => setSelectedDataKey(e.target.value)}
                className="border p-2 rounded mr-2"
              >
                {columns.filter(col => col.isNumeric).map((column) => (
                  <option key={column.accessorKey} value={column.accessorKey}>
                    {column.header}
                  </option>
                ))}
              </select>
              <select
                value={categoricalKey}
                onChange={(e) => setCategoricalKey(e.target.value)}
                className="border p-2 rounded"
              >
                {columns.filter(col => !col.isNumeric).map((column) => (
                  <option key={column.accessorKey} value={column.accessorKey}>
                    {column.header}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            {selectedChartType === 'bar' && (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={categoricalKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={selectedDataKey} fill="#8884d8" />
              </BarChart>
            )} 
            
            {selectedChartType === 'line' && (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={categoricalKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={selectedDataKey} stroke="#8884d8" />
              </LineChart>
            )}
            {selectedChartType === 'pie' && (
              <PieChart>
                <Pie
                  data={data}
                  dataKey={selectedDataKey}
                  nameKey={categoricalKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total Records: {data.length}</p>
          {columns.filter(col => col.isNumeric).map((column) => {
            const validValues = data.map(item => item[column.accessorKey]).filter(value => !isNaN(value));
            const avg = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
            return <p key={column.accessorKey}>Average {column.header}: {avg.toFixed(2)}</p>;
          })}
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

  const ListView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Data List View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.accessorKey} className="px-4 py-2 text-left">{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                  {columns.map((column) => (
                    <td key={column.accessorKey} className="px-4 py-2">{item[column.accessorKey]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 space-y-4">
      <div className="flex justify-end space-x-2">
        <Button onClick={() => setLayout('grid')} variant={layout === 'grid' ? 'default' : 'outline'}>
          <Grid className="mr-2 h-4 w-4" /> Grid
        </Button>
        <Button onClick={() => setLayout('list')} variant={layout === 'list' ? 'default' : 'outline'}>
          <List className="mr-2 h-4 w-4" /> List
        </Button>
      </div>
      {layout === 'grid' ? <GridLayout /> : <ListView />}
    </div>
  );
};

export default OverviewDashboard;