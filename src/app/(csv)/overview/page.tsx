"use client"
import React, { useEffect, useState } from 'react';

const OverviewPage: React.FC = () => {
  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/get-csv-data');
      const data = await response.json();
      setTableData(data);
    };

    fetchData();
  }, []);

  if (tableData.length === 0) return <p>Loading...</p>;

  const headers = Object.keys(tableData[0]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((header) => (
                <td key={header}>{row[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OverviewPage;
