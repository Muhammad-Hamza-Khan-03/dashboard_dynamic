// // store/useDataStore.ts
// import { ColumnDef, Row } from '@tanstack/react-table';
// import { create } from 'zustand';

// type DataItem = {
//   [key: string]: any;
// };

// interface DataState {
//   data: DataItem[];
//   columns: ColumnDef<DataItem, any>[];
//   selectedFile: string | null;
//   selectedRows: Row<DataItem>[];
//   setSelectedFile: (file: string | null) => void;
//   setData: (data: DataItem[]) => void;
//   setColumns: (columns: ColumnDef<DataItem, any>[]) => void;
//   setSelectedRows: (rows: Row<DataItem>[]) => void;
// }

// const useDataStore = create<DataState>((set) => ({
//   data: [],
//   columns: [],
//   selectedFile: null,
//   selectedRows: [],
//   setSelectedFile: (file) => set({ selectedFile: file }),
//   setData: (data) => set({ data }),
//   setColumns: (columns) => set({ columns }),
//   setSelectedRows: (rows) => set({ selectedRows: rows }),
// }));

// export default useDataStore;
