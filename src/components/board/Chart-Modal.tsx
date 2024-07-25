"use client"
import Modal from "./modal";
import {Months,expenses,sidebarData } from "./Chart-data";
import React, { useState } from 'react'

import {
    Chart as ChartJS,

    LinearScale,
    PointElement,
    LineElement,
    CategoryScale,
    Ticks
} from 'chart.js';

import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement)

const chartOptions = {
    Responsive: true,
    plugins: {
        legend: {
            display: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false,
            },

        },
        y: {
            min: 20,
            max: 400,
            ticks: {
                stepSize: 500,
                callback: (value: any) => Number(value) / 1000 + 'k',
            }
        },
    }

};

const chartData = {
    labels: Months,
    datasets: [
        {
            label: 'expensive',
            data: expenses,
            borderColor: '#ca3a12',
            backgroundColor: 'transparent',
            pointBorderColor: 'transparent',
            transition:0.25,
            
        }
    ]
}
const ChartModal = () => {
    const [showModal, setShowModal] = useState(false);
    
    const openModalHandler = () => {
        setShowModal(true);
    }
    const closeModalHandler = () => {
        setShowModal(false);
    }

    return (
    <div>
            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg" 
                onClick={openModalHandler}>
            Show Chart Modal    
            </button>
            <Modal isOpen={showModal}
                onDismiss={closeModalHandler}
                title="Chart Modal"
            sidebarColumns={sidebarData}>
                
                <div className="my-4 w-full max-h-full">
                    {/* package:chart.js react-chartjs-2 */}
                    <Line
                        options={chartOptions}
                        data={chartData} />
                    
</div>
            </Modal>
    </div>
  )
}

export default ChartModal
