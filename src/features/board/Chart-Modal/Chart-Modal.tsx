import React from 'react';
import Modal from "./modal";
import { useModalSheet } from '@/features/board/Chart-Modal/useChartModal-sheet';
import { Button } from '../../../components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ChartData {
    type: string;
    columns: string[];
    fileId: string;
    data: any[];
}

interface ChartResult {
    id: string;
    title: string;
    type: string;
    graphUrl: string;
}

interface Column {
    header: string;
    accessorKey: string;
    isNumeric: boolean;
}

interface ChartModalProps {
    data: any[];
    columns: Column[];
    selectedColumns: string[];
    setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
    fileId: string;
    onExport: (chartData: ChartData) => Promise<ChartResult>;
}

const ChartModal: React.FC<ChartModalProps> = ({
    data,
    columns,
    selectedColumns,
    setSelectedColumns,
    fileId,
    onExport
}) => {
    const { showModal, chartType, openModal, closeModal, setChartType } = useModalSheet();

    const handleColumnSelect = (column: string) => {
        setSelectedColumns(prev => 
            prev.includes(column) ? prev.filter(col => col !== column) : [...prev, column]
        );
    };

    const handleExport = async () => {
        try {
            const chartData: ChartData = {
                type: chartType,
                columns: selectedColumns,
                fileId: fileId,
                data: data
            };
            await onExport(chartData);
            closeModal();
        } catch (error) {
            console.error('Error exporting chart:', error);
        }
    };

    const renderPreview = () => {
        if (selectedColumns.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-700">Select a column for X-axis</p>
                    <p className="text-sm text-gray-500 mt-2">Choose a column from the sidebar to start creating your chart</p>
                </div>
            );
        }

        if (selectedColumns.length === 1) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-700">Select a column for Y-axis</p>
                    <p className="text-sm text-gray-500 mt-2">Choose another column to complete your chart</p>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center h-full">
                <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
                <p className="text-xl font-semibold text-gray-700">Chart Preview will be generated on export</p>
            </div>
        );
    };

    return (
        <>
            <Button 
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700" 
                onClick={openModal}
            >
                Simple Chart
            </Button>
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onDismiss={closeModal}
                    title="Chart Creator"
                    sidebarColumns={columns.map(col => col.header)}
                    selectedColumns={selectedColumns}
                    onColumnSelect={handleColumnSelect}
                    chartType={chartType}
                    onChartTypeChange={(e: React.ChangeEvent<HTMLSelectElement>) => setChartType(e.target.value)}
                    onExport={handleExport}
                >
                    <div className="w-full h-full">
                        {renderPreview()}
                    </div>
                </Modal>
            )}
        </>
    );
};

export default ChartModal;