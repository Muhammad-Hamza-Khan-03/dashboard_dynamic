import React, { MouseEventHandler } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    onExport: () => void,
};

const Modal = ({ isOpen, title = "Chart Creator", onDismiss, children, sidebarColumns, selectedColumns, onColumnSelect, chartType, onChartTypeChange, onExport }: Modal_types) => {
    if (!isOpen) {
        return null;
    }

    const handleColumnClick = (column: string) => {
        onColumnSelect(column);
    };

    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center' onClick={onDismiss}>
            <div className='w-4/5 h-4/5 bg-white rounded-lg flex flex-col shadow-lg' onClick={(event) => event.stopPropagation()}>
                <div className='flex items-center justify-between p-4 border-b border-gray-200'>
                    <h1 className='text-2xl font-bold'>{title}</h1>
                    <div className='flex items-center'>
                       
            <Button 
    onClick={onExport} 
    className="mr-4 bg-green-500 hover:bg-green-600 text-white"
    disabled={selectedColumns.length < 2}
>
    {selectedColumns.length < 2 ? 'Select Columns to Export' : 'Export'}
</Button>
                        
                        <button className='text-2xl text-gray-600 hover:text-gray-900' onClick={onDismiss}>
                            <X />
                        </button>
                        
                    </div>
                </div>
                <div className='flex flex-1 overflow-hidden'>
                    <div className='w-1/4 bg-gray-100 p-4 overflow-auto'>
                        <h2 className="text-xl font-semibold mb-4">Select Data</h2>
                        <div className="mb-4">
                            <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-2">Chart Type:</label>
<select id="chartType" value={chartType} onChange={onChartTypeChange} className="p-2 border rounded-lg w-full bg-white shadow-sm">
    <option value="line">Line Chart</option>
    <option value="bar">Bar Chart</option>
    <option value="pie">Pie Chart</option>
    <option value="segmented">Segmented Chart</option>
    <option value="segmented-bar">Segmented Bar Chart</option>
    <option value="histogram">Histogram</option>
    <option value="scatter">Scatter Plot</option>
    <option value="box">Box Plot</option>
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
                    <div className='w-3/4 p-4 flex items-center justify-center'>
                        {children}
                    </div>
                    
                </div>
            </div>
        </div>
    );
};

export default Modal;