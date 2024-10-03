import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  Column,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Filter, ArrowUpDown } from 'lucide-react'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  onRowSelectionChange: (rows: Row<TData>[]) => void
}

export function DataTable<TData>({
  columns,
  data,
  onRowSelectionChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false)
  const [activeColumn, setActiveColumn] = React.useState<Column<TData, unknown> | null>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
  })

  React.useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    onRowSelectionChange(selectedRows);
  }, [rowSelection, onRowSelectionChange, table]);

  const openFilterPanel = (column: Column<TData, unknown>) => {
    setActiveColumn(column)
    setFilterPanelOpen(true)
  }

  const uniqueValues = React.useMemo(() => {
    if (!activeColumn) return []
    return Array.from(new Set(data.map(row => (row as any)[activeColumn.id])))
  }, [activeColumn, data])

  const isNumericColumn = React.useMemo(() => {
    if (!activeColumn || uniqueValues.length === 0) return false
    return typeof uniqueValues[0] === 'number'
  }, [activeColumn, uniqueValues])

  return (
    <div>
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
                        onClick={() => openFilterPanel(header.column)}
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
            {table.getRowModel().rows.map((row) => (
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
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Sheet open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter and Sort</SheetTitle>
            <SheetDescription>
              Apply filters and sorting to the {activeColumn?.id} column
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter">Filter</Label>
              {isNumericColumn ? (
                <div className="flex space-x-2">
                  <Input
                    id="min"
                    placeholder="Min"
                    type="number"
                    onChange={(e) => {
                      activeColumn?.setFilterValue((old: [number, number]) => [Number(e.target.value), old?.[1]])
                    }}
                  />
                  <Input
                    id="max"
                    placeholder="Max"
                    type="number"
                    onChange={(e) => {
                      activeColumn?.setFilterValue((old: [number, number]) => [old?.[0], Number(e.target.value)])
                    }}
                  />
                </div>
              ) : (
                <Select
                  onValueChange={(value) => activeColumn?.setFilterValue(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                    {uniqueValues
                    .map((value) => (
                      <SelectItem key={value as string} value={value as string}>
                        {value as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort">Sort</Label>
              <Select
                onValueChange={(value) => {
                  if (value === 'asc') {
                    activeColumn?.toggleSorting(false)
                  } else if (value === 'desc') {
                    activeColumn?.toggleSorting(true)
                  } else {
                    activeColumn?.clearSorting()
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="clear">Clear Sorting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetClose asChild>
            <Button type="submit">Apply</Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  )
}