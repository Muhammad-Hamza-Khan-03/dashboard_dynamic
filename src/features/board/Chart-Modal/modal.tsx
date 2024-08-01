import React, { MouseEventHandler } from 'react';
import { X } from 'lucide-react';

type Modal_types = {
    isOpen: boolean,
    title?: string,
    onDismiss?: MouseEventHandler,
    children: React.ReactNode,
    sidebarColumns: string[],
    selectedColumns: string[],
    onColumnSelect: (column: string) => void,
    chartType: string,
    onChartTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
};

const Modal = ({ isOpen, title = "My modal", onDismiss, children, sidebarColumns, selectedColumns, onColumnSelect, chartType, onChartTypeChange }: Modal_types) => {
    if (!isOpen) {
        return null;
    }

    const handleColumnClick = (column: string) => {
        onColumnSelect(column);
    };

    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center' onClick={onDismiss}>
            <div className='w-4/5 h-4/5 bg-white rounded-lg p-6 flex flex-row relative shadow-lg' onClick={(event) => event.stopPropagation()}>
                <div className='w-1/4 bg-gray-100 p-4 rounded-l-lg overflow-auto'>
                    <h2 className="text-xl font-semibold mb-4">Select Data</h2>
                    <div className="mb-4">
                        <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-2">Chart Type:</label>
                        <select id="chartType" value={chartType} onChange={onChartTypeChange} className="p-2 border rounded-lg w-full bg-white shadow-sm">
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="pie">Pie Chart</option>
                            
                        </select>
                    </div>
                    <div className="mb-4">
                        <h3 className="text-lg font-medium mb-2">Columns</h3>
                        <ul className="space-y-1">
                            {sidebarColumns.map((item, index) => (
                                <li
                                    key={index}
                                    className={`cursor-pointer p-2 rounded-md ${selectedColumns.includes(item) ? 'bg-blue-200' : 'bg-white'} hover:bg-blue-100`}
                                    onClick={() => handleColumnClick(item)}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className='w-3/4 p-4 relative flex flex-col'>
                    <button className='absolute top-3 right-3 text-2xl text-gray-600 hover:text-gray-900' onClick={onDismiss}>
                        <X />
                    </button>
                    <div className='flex items-center mb-4 border-b border-gray-300'>
                        <h1 className='text-2xl font-bold'>{title}</h1>
                    </div>
                    <div className='flex-grow flex items-center justify-center overflow-hidden'>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
