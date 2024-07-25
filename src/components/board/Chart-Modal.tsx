"use client";
import Modal from "./modal";
import { Months, expenses, sidebarData } from "./Chart-data";
import React, { useState } from 'react'

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

//data
const data = Months.map((month, index) => ({
    month,
    expense: expenses[index],
}));

const ChartModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [chartType, setChartType] = useState("line");

    const openModalHandler = () => {
        setShowModal(true);
    }
    const closeModalHandler = () => {
        setShowModal(false);
    }

    //chart type
    const handleChartTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setChartType(event.target.value);
    };

    //charts renderer
    const renderChart = () => {
        switch (chartType) {
            case "line":
                return (
                    <LineChart data={data}>
                        <Line type="monotone" dataKey="expense" stroke="#ca3a12" />
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip />
                    </LineChart>
                );
            case "bar":
                return (
                    <BarChart data={data}>
                        <Bar dataKey="expense" fill="#ca3a12" />
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip />
                    </BarChart>
                );
            case "pie":
                return (
                    <PieChart>
                        <Pie data={data} dataKey="expense" nameKey="month" cx="50%" cy="50%" outerRadius={100} fill="#ca3a12">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`#${Math.floor(Math.random() * 16777215).toString(16)}`} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                );
            default:
                return (
                    <LineChart data={data}>
                        <Line type="monotone" dataKey="expense" stroke="#ca3a12" />
                        <CartesianGrid stroke="#ccc" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip />
                    </LineChart>
                );
        }
    };

    return (
        <div>
            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg" onClick={openModalHandler}>
                Show Chart Modal
            </button>
            <Modal
                isOpen={showModal}
                onDismiss={closeModalHandler}
                title="Chart Modal"
                sidebarColumns={sidebarData}
                chartType={chartType}
                onChartTypeChange={handleChartTypeChange}
            >
                <div className="my-4 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </Modal>
        </div>
    );
}

export default ChartModal;
