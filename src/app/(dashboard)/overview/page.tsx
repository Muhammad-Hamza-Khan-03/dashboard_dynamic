// import MultiDashboardPage from "@/Chart_layouts/Multiple_dashboard";
// import OverviewDashboard from "@/Chart_layouts/overview_dashboard";

// const OverviewPage: React.FC = () => {
//   return (
//     <div className="p-4">
//       <h1 className="text-2xl font-bold mb-4">Overview Dashboard</h1>
//       <OverviewDashboard />
//       <MultiDashboardPage />
//     </div> 
//   );
// };

// export default OverviewPage;
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ArrowRight, BarChart2, PieChart as PieChartIcon } from "lucide-react"

// Sample data for charts
const lineChartData = [
  { month: "Jan", sales: 4000 },
  { month: "Feb", sales: 3000 },
  { month: "Mar", sales: 5000 },
  { month: "Apr", sales: 4500 },
  { month: "May", sales: 6000 },
  { month: "Jun", sales: 5500 },
]

const barChartData = [
  { category: "Electronics", revenue: 4000 },
  { category: "Clothing", revenue: 3000 },
  { category: "Books", revenue: 2000 },
  { category: "Home", revenue: 2780 },
  { category: "Sports", revenue: 1890 },
]

const pieChartData = [
  { name: "North America", value: 400 },
  { name: "Europe", value: 300 },
  { name: "Asia", value: 300 },
  { name: "South America", value: 200 },
  { name: "Africa", value: 100 },
]

const scatterChartData = [
  { satisfaction: 80, usage: 20 },
  { satisfaction: 85, usage: 25 },
  { satisfaction: 90, usage: 30 },
  { satisfaction: 95, usage: 35 },
  { satisfaction: 100, usage: 40 },
]

const areaChartData = [
  { month: "Jan", users: 4000 },
  { month: "Feb", users: 5000 },
  { month: "Mar", users: 6000 },
  { month: "Apr", users: 8000 },
  { month: "May", users: 10000 },
  { month: "Jun", users: 12000 },
]

const heatmapData = [
  { region: "North", clicks: 2000 },
  { region: "South", clicks: 3000 },
  { region: "East", clicks: 4000 },
  { region: "West", clicks: 3500 },
]

const gaugeChartData = [
  { name: "Low", value: 30, color: "#FF0000" },
  { name: "Medium", value: 30, color: "#FFFF00" },
  { name: "High", value: 40, color: "#00FF00" },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function ChartDashboard() {
  const [dateRange, setDateRange] = useState("Last 30 Days")

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <BarChart2 className="h-8 w-8 text-blue-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Chart Explorer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <Button>Create New Chart</Button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
              <CardDescription>Monthly sales data</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ sales: { label: "Sales", color: "hsl(var(--chart-1))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue by Category</CardTitle>
              <CardDescription>Revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--chart-2))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Market Share by Region</CardTitle>
              <CardDescription>Distribution of market share</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--chart-3))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 flex flex-wrap justify-center">
                {pieChartData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center mr-4 mb-2">
                    <div className="w-3 h-3 mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Satisfaction vs Usage</CardTitle>
              <CardDescription>Correlation between satisfaction and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  satisfaction: { label: "Satisfaction", color: "hsl(var(--chart-4))" },
                  usage: { label: "Usage", color: "hsl(var(--chart-5))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="usage" name="Usage" unit="%" />
                    <YAxis type="number" dataKey="satisfaction" name="Satisfaction" unit="%" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Scatter name="Satisfaction vs Usage" data={scatterChartData} fill="var(--color-satisfaction)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cumulative User Sign-ups</CardTitle>
              <CardDescription>User growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ users: { label: "Users", color: "hsl(var(--chart-6))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="users" stroke="var(--color-users)" fill="var(--color-users)" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Heatmap (Simplified as a Bar Chart) */}
          <Card>
            <CardHeader>
              <CardTitle>Website Clicks by Region</CardTitle>
              <CardDescription>Click intensity across regions</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ clicks: { label: "Clicks", color: "hsl(var(--chart-7))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="region" type="category" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="var(--color-clicks)">
                      {heatmapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(200, 50%, ${100 - (entry.clicks / 40)}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gauge Chart (Simplified as a Pie Chart) */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Target Achievement</CardTitle>
              <CardDescription>Progress towards sales goal</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--chart-8))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeChartData}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {gaugeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 text-center font-bold text-2xl">75%</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2023 Chart Explorer. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-blue-500 hover:text-blue-600">Tutorials</a>
              <a href="#" className="text-sm text-blue-500 hover:text-blue-600">Customization Guide</a>
              <a href="#" className="text-sm text-blue-500 hover:text-blue-600">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}