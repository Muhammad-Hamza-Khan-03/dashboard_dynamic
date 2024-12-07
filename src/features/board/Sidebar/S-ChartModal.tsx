import React, { useState, useEffect } from 'react';
import Modal from "./S-Modal";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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

interface S_ChartModalProps {
    data: any[];
    columns: Column[];
    selectedColumns: string[];
    setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
    fileId: string;
    onExport: (chartData: ChartData) => Promise<ChartResult>;
}

export const chartTypes = [
    { type: 'line', icon: LineChartIcon, label: 'Line Chart' },
    { type: 'bar', icon: BarChartIcon, label: 'Bar Chart' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
];


const S_ChartModal: React.FC<S_ChartModalProps> = ({
    data,
    columns,
    selectedColumns,
    setSelectedColumns,
    fileId,
    onExport
}) => {
    const [showModal, setShowModal] = useState(false);
    const [chartType, setChartType] = useState("line");
    const [localSelectedColumns, setLocalSelectedColumns] = useState<string[]>([]);

    useEffect(() => {
        if (columns.length > 0 && localSelectedColumns.length === 0) {
            setLocalSelectedColumns([columns[0].accessorKey]);
        }
    }, [columns]);

    const openModalHandler = () => setShowModal(true);
    const closeModalHandler = () => {
        setShowModal(false);
        setSelectedColumns(localSelectedColumns);
    };

    const handleChartTypeChange = (type: string) => setChartType(type);

    const handleColumnToggle = (column: string) => {
        setLocalSelectedColumns(prev =>
            prev.includes(column)
                ? prev.filter(c => c !== column)
                : [...prev, column]
        );
    };

    const handleExport = async () => {
        try {
            const chartData: ChartData = {
                type: chartType,
                columns: localSelectedColumns,
                fileId: fileId,
                data: data
            };
            await onExport(chartData);
            closeModalHandler();
        } catch (error) {
            console.error('Error exporting chart:', error);
        }
    };
    return (
        <div>
            <Button onClick={openModalHandler}>Side Chart</Button>
            <Modal isOpen={showModal} onDismiss={closeModalHandler}>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {chartTypes.map(({ type, icon: Icon, label }) => (
                        <Card
                            key={type}
                            className={`cursor-pointer transition-all ${chartType === type ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => handleChartTypeChange(type)}
                            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <Icon className="h-12 w-12 mb-2" />
                                <span>{label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex space-x-4 mb-6">
                    {columns.map((column) => (
                        <div key={column.accessorKey} className="flex items-center space-x-2">
                            <Checkbox
                                id={column.accessorKey}
                                checked={localSelectedColumns.includes(column.accessorKey)}
                                onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                            />
                            <label htmlFor={column.accessorKey}>{column.header}</label>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={closeModalHandler}>Cancel</Button>
                    <Button 
                        onClick={handleExport}
                        disabled={localSelectedColumns.length < 2}
                    >
                        Export Chart
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default S_ChartModal;