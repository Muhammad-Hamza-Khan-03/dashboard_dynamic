// dataTypeChecks.ts

// export const isValidDate = (dateString: string): boolean => {
//   const date = new Date(dateString);
//   return !isNaN(date.getTime());
// };

export const isTimestamp = (value: any): boolean => {
  return !isNaN(value) && value.toString().length === 10;
};

export const isPythonList = (value: string): boolean => {
  return typeof value === 'string' && value.startsWith('[') && value.endsWith(']');
};

export const isPythonDict = (value: string): boolean => {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
};

export const isPythonSet = (value: string): boolean => {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}') && !value.includes(':');
};

export interface ColumnTypes {
  [key: string]: string;
}

export const isValidDate = (dateString: string): boolean => {
  // Check if the string is in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
  
  // Check other common date formats
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export interface FileSummary {
  rows: number;
  columns: number;
  numericColumns: string[];
  categoricalColumns: string[];
  columnsWithMissingValues: string[];
  columnTypes: ColumnTypes;
}

export const analyzeColumns = (columns: string[], allRowsData: any[]): FileSummary => {
  const columnTypes: ColumnTypes = {};
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const columnsWithMissingValues: string[] = [];

  columns.forEach((col) => {
    const colValues = allRowsData.map((row) => row[col]);
    const nonNullValues = colValues.filter((value) => value !== undefined && value !== null);

    const missingValuesCount = colValues.filter((value) => value === null || value === '').length;

    if (missingValuesCount > 0) {
      columnsWithMissingValues.push(col);
    }

    if (nonNullValues.length === 0) {
      columnTypes[col] = 'Empty';
    } else if (nonNullValues.every((value) => !isNaN(parseFloat(value)) && isFinite(value))) {
      if (nonNullValues.every((value) => Number.isInteger(parseFloat(value)))) {
        if (nonNullValues.every((value) => parseInt(value) === 0 || parseInt(value) === 1)) {
          columnTypes[col] = 'Bool (0/1)';
        } else {
          columnTypes[col] = 'Int';
        }
      } else {
        columnTypes[col] = 'Float';
      }
      numericColumns.push(col);
    } else if (nonNullValues.every(isValidDate)) {
      columnTypes[col] = 'Datetime';
    } else if (nonNullValues.every(isTimestamp)) {
      columnTypes[col] = 'Timestamp';
    } else if (nonNullValues.every((value) => typeof value === 'boolean' || (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')))) {
      columnTypes[col] = 'Bool';
    } else if (nonNullValues.every(isPythonList)) {
      columnTypes[col] = 'List';
    } else if (nonNullValues.every(isPythonDict)) {
      columnTypes[col] = 'Dict';
    } else if (nonNullValues.every(isPythonSet)) {
      columnTypes[col] = 'Set';
    } else {
      const uniqueValues = new Set(nonNullValues);
      if (uniqueValues.size <= 10 && uniqueValues.size / nonNullValues.length < 0.5) {
        columnTypes[col] = 'Category';
        categoricalColumns.push(col);
      } else {
        columnTypes[col] = 'Object';
      }
    }
  });

  return {
    rows: allRowsData.length,
    columns: columns.length,
    numericColumns,
    categoricalColumns,
    columnsWithMissingValues,
    columnTypes,
  };
};
