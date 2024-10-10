import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,Tooltip, ResponsiveContainer, Line } from 'recharts'
import { PlusCircle, Settings, Filter, Database, Cog, ChevronRight, LineChart } from 'lucide-react'
// import React, { PureComponent } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type data={
  name:string,
  uv:number,
  pv:number,
  amt:number
}
const data = [
  {
    name: 'Page A',
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page B',
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: 'Page C',
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: 'Page D',
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: 'Page E',
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: 'Page F',
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: 'Page G',
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];


const data1 = [
  { streams: 4000, revenue: 2400 },
  { streams: 3000, revenue: 1398 },
  { streams: 2000, revenue: 9800 },
  { streams: 2780, revenue: 3908 },
  { streams: 1890, revenue: 4800 },
  { streams: 2390, revenue: 3800 },
  { streams: 3490, revenue: 4300 },
]

const sidebarItems = [
  { icon: PlusCircle, label: 'Add' },
  { icon: Settings, label: 'Setup' },
  { icon: Filter, label: 'Filter' },
  { icon: Database, label: 'Data' },
  { icon: Cog, label: 'Settings' },
]


export default function Workspace() {

  
  return (
    
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar */}
        <div className="w-20 bg-white shadow-md flex flex-col items-center py-8 space-y-8">
          {sidebarItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center cursor-pointer group">
              <div className="p-3 rounded-lg group-hover:bg-teal-50 transition-colors duration-200">
                <item.icon className="w-6 h-6 text-gray-500 group-hover:text-teal-500" />
              </div>
              <span className="text-xs mt-1 text-gray-500 group-hover:text-teal-500">{item.label}</span>
            </div>
          ))}
        </div>
  
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Section */}
          <header className="bg-white shadow-sm py-4 px-6">
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          </header>
  
          {/* Chart Area */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Count of Streams sliced by Artist</h2>
                <p className="text-sm text-gray-500 mt-1">Comparing stream counts across different artists</p>
                <a href="#" className="text-teal-500 text-sm hover:underline mt-2 inline-block">Read More</a>
              </div>
              <div className="h-96">
                {/* <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="streams" fill="#3B82F6" />
                    <Bar dataKey="revenue" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer> */}
                  
              </div>
            </div>
  
            {/* Suggested Insights */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Suggested Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-white rounded-lg shadow-md p-4">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Insight {item}</h4>
                    <p className="text-sm text-gray-500">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    <a href="#" className="text-teal-500 text-sm hover:underline mt-2 inline-block">Explore</a>
                  </div>
                ))}
              </div>
            </div>
          </main>
  
          {/* Footer */}
          <footer className="bg-white shadow-md py-4 px-6 flex justify-end">
            {/* <button className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors duration-200 flex items-center">
              Load More
              <ChevronRight className="ml-2 w-4 h-4" />
            </button> */}
          </footer>
        </div>
      </div>
    )
}
