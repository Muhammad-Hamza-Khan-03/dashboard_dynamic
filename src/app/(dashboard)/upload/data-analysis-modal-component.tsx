import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BarChart2, TrendingUp, Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Plot from 'react-plotly.js';
import axios from 'axios';

interface AnalysisModalProps {
  fileId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisModal = ({ fileId, userId, isOpen, onClose }: AnalysisModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [basicStats, setBasicStats] = useState<any>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [customResults, setCustomResults] = useState<any>(null);
  const [newHeader, setNewHeader] = useState('');
  const [headerValue, setHeaderValue] = useState('');


  const renderNumericSummary = (stats: any) => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(stats).map(([column, columnStats]: [string, any]) => (
          <div key={column} className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">{column}</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-gray-600">Mean:</dt>
                <dd className="font-mono">{Number(columnStats.mean).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Median:</dt>
                <dd className="font-mono">{Number(columnStats.median).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Std Dev:</dt>
                <dd className="font-mono">{Number(columnStats.std).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Q1:</dt>
                <dd className="font-mono">{Number(columnStats.quartiles[0]).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Q3:</dt>
                <dd className="font-mono">{Number(columnStats.quartiles[1]).toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    );
  };

  // Analysis options
  const basicAnalysisOptions = [
    'numeric_summaries',
    'missing_values',
    'unique_counts',
    'distributions'
  ];

  const advancedAnalysisOptions = [
    'correlation_matrix',
    'distribution_tests',
    'categorical_analysis',
    'outliers'
  ];

  useEffect(() => {
    if (isOpen && activeTab === 'basic') {
      fetchBasicAnalysis();
    }
  }, [isOpen, fileId]);

  const fetchBasicAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`http://localhost:5000/analyze/${userId}/${fileId}`, {
        analysis_type: 'basic'
      });
      setBasicStats(response.data.basic);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch basic analysis');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancedAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`http://localhost:5000/analyze/${userId}/${fileId}`, {
        analysis_type: 'advanced'
      });
      setAdvancedStats(response.data.advanced);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch advanced analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (customOptions.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`http://localhost:5000/analyze/${userId}/${fileId}`, {
        analysis_type: 'custom',
        options: customOptions
      });
      setCustomResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to perform custom analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHeader = async () => {
    if (!newHeader || !headerValue) return;

    setLoading(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/add-header/${userId}/${fileId}`, {
        header_name: newHeader,
        header_value: headerValue
      });
      setNewHeader('');
      setHeaderValue('');
      fetchBasicAnalysis(); // Refresh stats after adding header
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add header');
    } finally {
      setLoading(false);
    }
  };

  const renderCorrelationHeatmap = () => {
    if (!advancedStats?.correlation_matrix) return null;

    const { correlation_matrix } = advancedStats;
    const columns = Object.keys(correlation_matrix);
    const values = columns.map(col1 => 
      columns.map(col2 => correlation_matrix[col1][col2]?.correlation || 0)
    );

    return (
      <Plot
        data={[{
          z: values,
          x: columns,
          y: columns,
          type: 'heatmap',
          colorscale: 'RdBu'
        }]}
        layout={{
          title: 'Correlation Matrix',
          width: 600,
          height: 500
        }}
      />
    );
  };

  const renderDistributionPlots = () => {
    if (!basicStats?.numeric_summaries) return null;

    return Object.entries(basicStats.numeric_summaries).map(([column, stats]: [string, any]) => {
        const plotData = {
            type: "box", // Change this line
            name: column,
            y: stats.values,
            boxpoints: 'outliers',
            marker: {
              color: 'rgb(107, 107, 255)'
            }
          };

      return (
        <Card key={column} className="mb-4">
          <CardContent className="pt-6">
            <h4 className="text-lg font-semibold mb-2">{column} Distribution</h4>
            <Plot
              data={[plotData]}
              layout={{
                title: `${column} Box Plot`,
                width: 400,
                height: 300,
                margin: { t: 40, r: 20, l: 40, b: 30 }
              }}
              config={{ responsive: true }}
            />
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Data Analysis Dashboard</DialogTitle>
          <DialogDescription>
            Explore and analyze your data with interactive visualizations and statistics
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

<Tabs defaultValue="basic" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Analysis</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
            <TabsTrigger value="custom">Custom Analysis</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(80vh-10rem)] mt-4 rounded-md border p-4">
            <TabsContent value="basic">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : basicStats && (
                <div className="space-y-6">
                  {/* Numeric Summaries */}
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-4">Numeric Summaries</h3>
                      {renderNumericSummary(basicStats.numeric_summaries)}
                    </CardContent>
                  </Card>

                  {/* Distribution Plots */}
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-4">Distributions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderDistributionPlots()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced">
              <div className="space-y-4">
                <Button
                  onClick={fetchAdvancedAnalysis}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Advanced Analysis...
                    </>
                  ) : (
                    'Generate Advanced Analysis'
                  )}
                </Button>

                {advancedStats && (
                  <div className="space-y-6">
                    {/* Correlation Matrix */}
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4">Correlation Analysis</h3>
                        {renderCorrelationHeatmap()}
                      </CardContent>
                    </Card>

                    {/* Distribution Tests */}
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4">Distribution Tests</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(advancedStats.distribution_tests || {}).map(([column, tests]: [string, any]) => (
                            <div key={column} className="p-4 border rounded-lg">
                              <h4 className="font-medium mb-2">{column}</h4>
                              <dl className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(tests.normality || {}).map(([test, value]: [string, any]) => (
                                  <div key={test}>
                                    <dt className="text-gray-600">{test}:</dt>
                                    <dd className="font-mono">
                                      {typeof value === 'number' ? value.toFixed(4) : JSON.stringify(value)}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Categorical Analysis */}
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4">Categorical Analysis</h3>
                        <div className="space-y-4">
                          {Object.entries(advancedStats.categorical_analysis || {}).map(([column, analysis]: [string, any]) => (
                            <div key={column} className="p-4 border rounded-lg">
                              <h4 className="font-medium mb-2">{column}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-sm font-medium">Top Categories</h5>
                                  <dl className="mt-2 text-sm">
                                    {Object.entries(analysis.frequencies || {}).slice(0, 5).map(([category, count]) => (
                                      <div key={category} className="flex justify-between">
                                        <dt className="text-gray-600">{category}:</dt>
                                        <dd className="font-mono">{count as number}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                                {analysis.chi_square && (
                                  <div>
                                    <h5 className="text-sm font-medium">Chi-Square Test</h5>
                                    <dl className="mt-2 text-sm">
                                      <div className="flex justify-between">
                                        <dt className="text-gray-600">Statistic:</dt>
                                        <dd className="font-mono">{analysis.chi_square.statistic.toFixed(4)}</dd>
                                      </div>
                                      <div className="flex justify-between">
                                        <dt className="text-gray-600">p-value:</dt>
                                        <dd className="font-mono">{analysis.chi_square.p_value.toExponential(4)}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Custom Analysis Options</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Basic Options</h4>
                        {basicAnalysisOptions.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                              checked={customOptions.includes(option)}
                              onCheckedChange={(checked) => {
                                setCustomOptions(prev => 
                                  checked 
                                    ? [...prev, option]
                                    : prev.filter(o => o !== option)
                                );
                              }}
                              id={`option-${option}`}
                            />
                            <Label htmlFor={`option-${option}`}>{option}</Label>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Advanced Options</h4>
                        {advancedAnalysisOptions.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                              checked={customOptions.includes(option)}
                              onCheckedChange={(checked) => {
                                setCustomOptions(prev => 
                                  checked 
                                    ? [...prev, option]
                                    : prev.filter(o => o !== option)
                                );
                              }}
                              id={`option-${option}`}
                            />
                            <Label htmlFor={`option-${option}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Add New Header</h3>
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="header-name">Header Name</Label>
                        <Input
                          id="header-name"
                          value={newHeader}
                          onChange={(e) => setNewHeader(e.target.value)}
                          placeholder="Enter header name"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="header-value">Default Value</Label>
                        <Input
                          id="header-value"
                          value={headerValue}
                          onChange={(e) => setHeaderValue(e.target.value)}
                          placeholder="Enter default value"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddHeader}
                          disabled={!newHeader || !headerValue || loading}
                        >
                          Add Header
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCustomAnalysis}
                    disabled={customOptions.length === 0 || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Custom Analysis...
                      </>
                    ) : (
                      'Generate Custom Analysis'
                    )}
                  </Button>

                  {customResults && (
                    <div className="mt-6 space-y-6">
                      {Object.entries(customResults).map(([key, value]) => (
                        <Card key={key}>
                          <CardContent className="pt-6">
                            <h4 className="text-lg font-semibold mb-4">{key}</h4>
                            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-60">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisModal;