import { X } from 'lucide-react';
import React, { MouseEventHandler } from 'react';

type Modal_types = {
    isOpen: boolean,
    title?: string,
    onDismiss?: MouseEventHandler,
    children: React.ReactNode,
    sidebarColumns: string[],
    chartType: string,
    onChartTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
};

const Modal = ({ isOpen, title = "My model", onDismiss, children, sidebarColumns, chartType, onChartTypeChange }: Modal_types) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center' onClick={onDismiss}>
            <div className='w-4/5 h-4/5 bg-white rounded-xl p-6 flex flex-row relative' onClick={(event) => event.stopPropagation()}>
                <div className='w-1/4 bg-gray-200 p-4 overflow-auto'>
                    <h2 className="font-bold mb-2">Sidebar</h2>
                    <div className="mb-4">
                        <label htmlFor="chartType" className="mr-2">Select Chart Type:</label>
                        <select id="chartType" value={chartType} onChange={onChartTypeChange} className="p-2 border rounded">
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="pie">Pie Chart</option>
                        </select>
                    </div>
                    <ul>
                        {sidebarColumns.map((item, index) => (
                            <li key={index} className="mb-1">{item}</li>
                        ))}
                    </ul>
                </div>
                <div className='w-3/4 p-4 relative'>
                    <div className='absolute right-4 top-3 text-2xl text-red-600 cursor-pointer' onClick={onDismiss}>
                        <X />
                    </div>
                    <div className='w-full h-10 flex items-center mb-1 border-b border-gray-300'>
                        <h1>{title}</h1>
                    </div>
                    <div className='w-full h-[calc(100%-2.5rem)]'>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
