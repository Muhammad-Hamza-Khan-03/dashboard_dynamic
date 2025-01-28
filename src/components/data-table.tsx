import * as React from 'react';
import axios from 'axios';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import type { FileData } from "@/features/sqlite/api/file-content";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Loader2 } from 'lucide-react';
import FilterSidebar from '@/app/(dashboard)/upload/filtering-sidebar';
import { toast } from '@/components/ui/use-toast';

interface PaginationInfo {
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface DataTableProps {
  columns: ColumnDef<FileData, any>[];
  data: FileData[];
  userId: string;
  fileId: string;
  onRowSelectionChange: (rows: Row<FileData>[]) => void;
  filterkey: string; // Used to trigger filter resets
  onReset: () => void;
}

export function DataTable({
  columns,
  data: initialData,
  userId,
  fileId,
  onRowSelectionChange,
  filterkey,
  onReset,
}: DataTableProps) {
  // State management
  const [data, setData] = React.useState<FileData[]>(initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);
  const [activeColumn, setActiveColumn] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [currentFilters, setCurrentFilters] = React.useState<any>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [paginationInfo, setPaginationInfo] = React.useState<PaginationInfo>({
    total_rows: 0,
    page: 1,
    page_size: 50,
    total_pages: 0,
  });

  // Reset filters when filterkey changes
  React.useEffect(() => {
    if (filterkey) {
      setCurrentFilters({});
      setCurrentPage(1);
      setData(initialData);
      setPaginationInfo({
        total_rows: initialData.length,
        page: 1,
        page_size: 50,
        total_pages: Math.ceil(initialData.length / 50),
      });
    }
  }, [filterkey, initialData]);

  // Update data when initialData changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Fetch filtered data from backend
  const fetchFilteredData = React.useCallback(async (
    filters: any = {},
    page: number = 1,
    sortBy?: { column: string; direction: string }
  ) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/apply-filters/${userId}/${fileId}`,
        {
          filters,
          sort_by: sortBy,
          page,
          page_size: paginationInfo.page_size,
        }
      );

      setData(response.data.data);
      setPaginationInfo(response.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch filtered data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, fileId, paginationInfo.page_size]);

  // Handle filter application
  const handleApplyFilters = async (filterData: {
    filters: any;
    sortBy?: { column: string; direction: string };
  }) => {
    setCurrentFilters(filterData.filters);
    await fetchFilteredData(filterData.filters, 1, filterData.sortBy);
  };

  // Reset filters and trigger parent reset
  const handleResetFilters = () => {
    setCurrentFilters({});
    setCurrentPage(1);
    onReset();
  };

  // Open filter panel for a column
  const openFilterPanel = (columnId: string) => {
    setActiveColumn(columnId);
    setFilterPanelOpen(true);
  };

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    fetchFilteredData(currentFilters, newPage);
  };

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
  });

  // Effect for row selection changes
  React.useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    onRowSelectionChange(selectedRows);
  }, [rowSelection, onRowSelectionChange, table]);

  return (
    <div className="space-y-4">
      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        activeColumn={activeColumn}
        userId={userId}
        fileId={fileId}
        onApplyFilters={handleApplyFilters}
      />

      {/* Active Filters Display */}
      {Object.keys(currentFilters).length > 0 && (
        <div className="bg-muted p-2 rounded-md flex items-center gap-2">
          <span className="text-sm font-medium">Active Filters:</span>
          {Object.entries(currentFilters).map(([column, value]) => (
            <div key={column} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              {column}: {typeof value === 'object' ? (
    `${value?.min || '*'} - ${value?.max || '*'}` as React.ReactNode
) : (
    value as React.ReactNode
)}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableHead>
                  <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                  />
                </TableHead>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <div className="flex items-center justify-between">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openFilterPanel(header.column.id)}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={(value) => row.toggleSelected(!!value)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage} of {paginationInfo.total_pages} ({paginationInfo.total_rows} total rows)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === paginationInfo.total_pages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;