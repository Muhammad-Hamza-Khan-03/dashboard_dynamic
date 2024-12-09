"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import axios from 'axios';

interface PivotTableProps {
  fileId: string;
  userId: string;
}

const PivotTable = ({ fileId, userId }: PivotTableProps) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [categoricalColumns, setCategoricalColumns] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string>('');
  const [selectedAggFunc, setSelectedAggFunc] = useState<string>('mean');
  const [pivotData, setPivotData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchColumns();
  }, [fileId]);

  const fetchColumns = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/get-columns/${userId}/${fileId}`);
      setColumns(response.data.columns);
      setNumericColumns(response.data.numeric_columns);
      setCategoricalColumns(response.data.categorical_columns);
    } catch (error) {
      console.error('Error fetching columns:', error);
    }
  };

  const generatePivot = async () => {
    if (!selectedIndex || !selectedColumns || !selectedValues) return;

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5000/generate-pivot/${userId}/${fileId}`, {
        index: selectedIndex,
        columns: selectedColumns,
        values: selectedValues,
        aggfunc: selectedAggFunc
      });
      setPivotData(response.data);
    } catch (error) {
      console.error('Error generating pivot table:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPivotTable = () => {
    if (!pivotData) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2">{selectedIndex}</th>
              {pivotData.columns.map((col: string) => (
                <th key={col} className="px-4 py-2">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pivotData.data.map((row: any[], i: number) => (
              <tr key={i}>
                <td className="px-4 py-2 font-medium">{pivotData.index[i]}</td>
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2">
                    {typeof cell === 'number' ? cell.toFixed(2) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Index (Rows)</Label>
            <Select value={selectedIndex} onValueChange={setSelectedIndex}>
              <SelectTrigger>
                <SelectValue placeholder="Select index" />
              </SelectTrigger>
              <SelectContent>
                {categoricalColumns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Columns</Label>
            <Select value={selectedColumns} onValueChange={setSelectedColumns}>
              <SelectTrigger>
                <SelectValue placeholder="Select columns" />
              </SelectTrigger>
              <SelectContent>
                {categoricalColumns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Values</Label>
            <Select value={selectedValues} onValueChange={setSelectedValues}>
              <SelectTrigger>
                <SelectValue placeholder="Select values" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Aggregation Function</Label>
            <Select value={selectedAggFunc} onValueChange={setSelectedAggFunc}>
              <SelectTrigger>
                <SelectValue placeholder="Select function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mean">Mean</SelectItem>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="min">Min</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generatePivot}
          disabled={loading || !selectedIndex || !selectedColumns || !selectedValues}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Pivot Table...
            </>
          ) : (
            'Generate Pivot Table'
          )}
        </Button>

        {pivotData && renderPivotTable()}
      </CardContent>
    </Card>
  );
};

export default PivotTable;