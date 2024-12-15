// interface DataItem {
//     [key: string]: string | number;
// }

// interface Column {
//     accessorKey: string;
//     header: string;
//     isNumeric: boolean;
// }

// export const fetchData = async (): Promise<{ data: DataItem[], columns: Column[], error: string | null }> => {
//     try {
//         const response = await fetch("/api/get-csv-data");
//         if (!response.ok) throw new Error("Failed to fetch data");
//         const fetchedData = await response.json();
        
//         const processedData = fetchedData.map((item: DataItem) => {
//             const processedItem: DataItem = {};
//             Object.keys(item).forEach(key => {
//                 const value = item[key];
//                 if (typeof value === 'string' && !isNaN(Number(value))) {
//                     processedItem[key] = parseFloat(value);
//                 } else {
//                     processedItem[key] = value;
//                 }
//             });
//             return processedItem;
//         });

//         const columns = processedData.length > 0 ? Object.keys(processedData[0]).map((key) => ({
//             accessorKey: key,
//             header: key,
//             isNumeric: typeof processedData[0][key] === 'number'
//         })) : [];

//         return { data: processedData, columns, error: null };
//     } catch (error) {
//         console.error("Error fetching data:", error);
//         return { data: [], columns: [], error: "Failed to fetch data" };
//     }
// };
