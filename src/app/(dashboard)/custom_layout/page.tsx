"use client"
import React, { useState } from 'react';

// Define the data object
const data = {
  opportunityCount: 487,
  revenue: "2bn",
  averageRevenue: "461M",
};

// Layout Component 1
function LayoutOne() {
  return (
    <div className="p-6 grid grid-cols-3 gap-4">
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Opportunity Count</h2>
        <p className="text-4xl">{data.opportunityCount}</p>
      </div>
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Revenue</h2>
        <p className="text-4xl">{data.revenue}</p>
      </div>
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Average Revenue</h2>
        <p className="text-4xl">{data.averageRevenue}</p>
      </div>
      <div className="col-span-2 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Opportunity Count by Month</h2>
        <div className="h-48 bg-gray-200">Bar Chart Placeholder</div>
      </div>
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Opportunity Count by Type</h2>
        <div className="h-48 bg-gray-200">Pie Chart Placeholder</div>
      </div>
      <div className="col-span-4 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Revenue by Category</h2>
        <div className="h-48 w-100 bg-gray-200">Bar Chart Placeholder</div>
      </div>
    </div>
  );
}

// Layout Component 2
function LayoutTwo() {
  return (
    <div className="p-6 grid grid-cols-2 gap-4">
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Revenue Details</h2>
        <p className="text-4xl">{data.revenue}</p>
      </div>
      <div className="col-span-1 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Average Revenue Details</h2>
        <p className="text-4xl">{data.averageRevenue}</p>
      </div>
      <div className="col-span-2 bg-white p-4 shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-4">Detailed Analysis</h2>
        <div className="h-48 bg-gray-200">Detailed Chart Placeholder</div>
      </div>
    </div>
  );
}

// Main Page Component
function Page() {
  const [showLayoutOne, setShowLayoutOne] = useState(true);

  return (
    <div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4"
        onClick={() => setShowLayoutOne(!showLayoutOne)}
      >
        Toggle Layout
      </button>
      {showLayoutOne ? <LayoutOne /> : <LayoutTwo />}
    </div>
  );
}

export default Page;
