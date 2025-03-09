// Basic Charts Configuration
const createBasicChartOptions = (type: string, data: any[], columns: string[]) => {
    const xAxisData = data.map(row => row[columns[0]]);
    const series = columns.slice(1).map(col => ({
      name: col,
      type,
      data: data.map(row => Number(row[col]))
    }));
  
    return {
      title: { text: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart` },
      tooltip: { trigger: 'axis' },
      legend: { data: columns.slice(1) },
      xAxis: { type: 'category', data: xAxisData },
      yAxis: { type: 'value' },
      series
    };
  };
  
  const createDataTable = (data: any[], columns: string[], options: any = {}) => {
    // Get specified number of rows or default to 10
    const numRows = options.numRows || 10;
    const tableData = data.slice(0, numRows);
  
    return {
      type: 'custom',
      componentType: 'DataTable',
      data: tableData,
      columns: columns,
      options: {
        pageSize: numRows,
        ...options
      }
    };
  };

  const createNumberCard = (data: any[], columns: string[], options: any = {}) => {
    // Get the first value from selected column
    const value = data[0][columns[0]];
    const title = options.title || columns[0];
  
    return {
      type: 'custom',
      componentType: 'NumberCard',
      data: {
        title: title,
        value: value
      }
    };
  };
  // const createTextBox = (options: any = {}) => {
  //   return {
  //     type: 'custom',
  //     componentType: 'TextBox',
  //     data: {
  //       text: options.text || '',
  //       position: options.position || { x: 0, y: 0 }
  //     }
  //   };
  // };
  // Line Chart
  const createLineChart = (data: any[], columns: string[]) => {
    return createBasicChartOptions('line', data, columns);
  };
  
  // Bar Chart
  const createBarChart = (data: any[], columns: string[]) => {
    return createBasicChartOptions('bar', data, columns);
  };
  
  // Pie Chart
  const createPieChart = (data: any[], columns: string[]) => {
    const pieData = data.map(row => ({
      name: row[columns[0]],
      value: Number(row[columns[1]])
    }));
  
    return {
      title: { text: 'Pie Chart' },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)'
      },
      series: [{
        name: columns[1],
        type: 'pie',
        radius: '55%',
        data: pieData
      }]
    };
  };
  
  // Scatter Plot
  const createScatterChart = (data: any[], columns: string[]) => {
    const scatterData = data.map(row => [
      Number(row[columns[0]]),
      Number(row[columns[1]])
    ]);
  
    return {
      title: { text: 'Scatter Plot' },
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{
        type: 'scatter',
        data: scatterData,
        symbolSize: 10
      }]
    };
  };
  
  // Box Plot
  const createBoxPlot = (data: any[], columns: string[]) => {
    const prepareBoxData = (values: number[]) => {
      values.sort((a, b) => a - b);
      const q1 = values[Math.floor(values.length * 0.25)];
      const q2 = values[Math.floor(values.length * 0.5)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const min = Math.max(q1 - 1.5 * iqr, values[0]);
      const max = Math.min(q3 + 1.5 * iqr, values[values.length - 1]);
      return [min, q1, q2, q3, max];
    };
  
    const boxData = columns.slice(1).map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      return prepareBoxData(values);
    });
  
    return {
      title: { text: 'Box Plot' },
      xAxis: {
        type: 'category',
        data: columns.slice(1)
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'boxplot',
        data: boxData
      }]
    };
  };
  
  // Histogram
  const createHistogram = (data: any[], columns: string[], binSize: number = 10) => {
    const values = data.map(row => Number(row[columns[0]]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / binSize;
    const bins = new Array(binSize).fill(0);
  
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binSize - 1);
      bins[binIndex]++;
    });
  
    const binLabels = Array.from({ length: binSize }, (_, i) => 
      `${(min + i * binWidth).toFixed(2)}-${(min + (i + 1) * binWidth).toFixed(2)}`
    );
  
    return {
      title: { text: 'Histogram' },
      xAxis: {
        type: 'category',
        data: binLabels
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: bins
      }]
    };
  };
  
  // Effect Scatter
  const createEffectScatter = (data: any[], columns: string[]) => {
    const scatterData = data.map(row => [
      Number(row[columns[0]]),
      Number(row[columns[1]])
    ]);
  
    return {
      title: { text: 'Effect Scatter' },
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{
        type: 'effectScatter',
        data: scatterData,
        symbolSize: 10,
        rippleEffect: {
          period: 4,
          scale: 4
        }
      }]
    };
  };
  
  // Funnel Chart
  const createFunnel = (data: any[], columns: string[]) => {
    const funnelData = data.map(row => ({
      name: row[columns[0]],
      value: Number(row[columns[1]])
    }));
  
    return {
      title: { text: 'Funnel Chart' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'funnel',
        data: funnelData,
        label: {
          position: 'inside'
        }
      }]
    };
  };
  
  // Gauge Chart
  const createGauge = (data: any[], columns: string[]) => {
    const value = Number(data[0][columns[0]]);
  
    return {
      title: { text: 'Gauge Chart' },
      series: [{
        type: 'gauge',
        data: [{ value, name: columns[0] }],
        detail: { formatter: '{value}%' }
      }]
    };
  };
  
  // Heatmap Chart
  const createHeatmap = (data: any[], columns: string[]) => {
    const heatmapData = data.map((row, i) => [
      i,
      Number(row[columns[1]]),
      Number(row[columns[2]])
    ]);
  
    return {
      title: { text: 'Heat Map' },
      tooltip: { position: 'top' },
      xAxis: { type: 'category' },
      yAxis: { type: 'category' },
      visualMap: {
        min: 0,
        max: Math.max(...heatmapData.map(d => d[2])),
        calculable: true
      },
      series: [{
        type: 'heatmap',
        data: heatmapData,
        label: { show: true }
      }]
    };
  };
  
  // K-Line (Candlestick) Chart
  const createKLine = (data: any[], columns: string[]) => {
    const kLineData = data.map(row => [
      row[columns[0]], // date
      Number(row[columns[1]]), // open
      Number(row[columns[2]]), // close
      Number(row[columns[3]]), // lowest
      Number(row[columns[4]]) // highest
    ]);
  
    return {
      title: { text: 'K-Line Chart' },
      xAxis: { type: 'category' },
      yAxis: { type: 'value' },
      series: [{
        type: 'candlestick',
        data: kLineData
      }]
    };
  };
  
  // Radar Chart
  const createRadar = (data: any[], columns: string[]) => {
    const indicators = columns.slice(1).map(col => ({
      name: col,
      max: Math.max(...data.map(row => Number(row[col])))
    }));
  
    const radarData = data.map(row => ({
      value: columns.slice(1).map(col => Number(row[col])),
      name: row[columns[0]]
    }));
  
    return {
      title: { text: 'Radar Chart' },
      tooltip: {},
      radar: {
        indicator: indicators
      },
      series: [{
        type: 'radar',
        data: radarData
      }]
    };
  };
  
  // Tree Map
  const createTreeMap = (data: any[], columns: string[]) => {
    const treeData = {
      name: 'root',
      children: data.map(row => ({
        name: row[columns[0]],
        value: Number(row[columns[1]])
      }))
    };
  
    return {
      title: { text: 'Tree Map' },
      series: [{
        type: 'treemap',
        data: [treeData],
        label: {
          show: true,
          formatter: '{b}'
        }
      }]
    };
  };
  
  // 3D Charts
  // Here are improved implementations for the 3D chart types in chart-configurations.ts

  const create3DBarChart = (data: any[], columns: string[]) => {
    // Prepare data for 3D chart
    const xAxis = [...new Set(data.map(row => row[columns[0]]))];
    const yAxis = [...new Set(data.map(row => row[columns[1]]))];
    
    // Create 3D data points
    const barData = data.map(row => [
      xAxis.indexOf(row[columns[0]]),
      yAxis.indexOf(row[columns[1]]),
      Number(row[columns[2]]) || 0
    ]);
    
    return {
      title: { text: '3D Bar Chart' },
      tooltip: {},
      visualMap: {
        max: Math.max(...barData.map(item => item[2])),
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', 
                  '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      xAxis3D: {
        type: 'category',
        data: xAxis,
        name: columns[0]
      },
      yAxis3D: {
        type: 'category',
        data: yAxis,
        name: columns[1]
      },
      zAxis3D: {
        type: 'value',
        name: columns[2]
      },
      grid3D: {
        boxWidth: 100,
        boxDepth: 80,
        viewControl: {
          // Initial view position
          beta: 30,
          alpha: 20,
          distance: 300,
          // Allow rotation and zooming
          autoRotate: false,
          rotateSensitivity: 5,
          zoomSensitivity: 5
        },
        light: {
          main: {
            intensity: 1.2,
            shadow: true
          },
          ambient: {
            intensity: 0.3
          }
        }
      },
      series: [{
        type: 'bar3D',
        data: barData,
        shading: 'lambert',
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true
          }
        }
      }]
    };
  };
  
  // 3D Line Chart
  const create3DLineChart = (data: any[], columns: string[]) => {
    // Ensure data is properly sorted for line presentation
    data = data.sort((a, b) => {
      const aX = Number(a[columns[0]]) || 0;
      const bX = Number(b[columns[0]]) || 0;
      return aX - bX;
    });
    
    // Extract 3D points
    const lineData = data.map(row => [
      Number(row[columns[0]]) || 0,
      Number(row[columns[1]]) || 0,
      Number(row[columns[2]]) || 0
    ]);
    
    return {
      title: { text: '3D Line Chart' },
      tooltip: {},
      xAxis3D: {
        type: 'value',
        name: columns[0]
      },
      yAxis3D: {
        type: 'value',
        name: columns[1]
      },
      zAxis3D: {
        type: 'value',
        name: columns[2]
      },
      grid3D: {
        viewControl: {
          projection: 'perspective',
          autoRotate: false
        },
        axisLine: {
          lineStyle: { 
            color: '#333' 
          }
        },
        axisPointer: {
          lineStyle: { 
            color: '#999',
            width: 2
          }
        }
      },
      series: [{
        type: 'line3D',
        data: lineData,
        lineStyle: {
          width: 4,
          color: '#0080ff'
        }
      }]
    };
  };
  
  // 3D Scatter Chart
  const create3DScatterChart = (data: any[], columns: string[]) => {
    // Prepare data for 3D scatter plot
    const scatterData = data.map(row => {
      return [
        Number(row[columns[0]]) || 0,
        Number(row[columns[1]]) || 0,
        Number(row[columns[2]]) || 0
      ];
    });
    
    return {
      title: { text: '3D Scatter Plot' },
      tooltip: {},
      xAxis3D: {
        type: 'value',
        name: columns[0],
        axisLabel: {
          formatter: '{value}'
        }
      },
      yAxis3D: {
        type: 'value',
        name: columns[1],
        axisLabel: {
          formatter: '{value}'
        }
      },
      zAxis3D: {
        type: 'value',
        name: columns[2],
        axisLabel: {
          formatter: '{value}'
        }
      },
      grid3D: {
        viewControl: {
          // Initial position
          beta: 40,
          alpha: 30,
          autoRotate: false,
          rotateSensitivity: 1
        },
        // Improved visual presentation
        boxWidth: 100,
        boxHeight: 80,
        boxDepth: 80,
        // Better lighting
        light: {
          main: {
            shadow: true,
            intensity: 1.5,
            shadowQuality: 'high'
          },
          ambient: {
            intensity: 0.5
          }
        }
      },
      series: [{
        type: 'scatter3D',
        data: scatterData,
        // Enhanced scatter points
        symbolSize: 12,
        itemStyle: {
          opacity: 0.8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.8)'
        },
        emphasis: {
          itemStyle: {
            color: '#ff4500'
          }
        }
      }]
    };
  };
  
  // 3D Surface Chart
  const create3DSurfaceChart = (data: any[], columns: string[]) => {
    // For a surface chart, we need to extract unique x and y values
    const xValues = [...new Set(data.map(row => Number(row[columns[0]])))].sort((a, b) => a - b);
    const yValues = [...new Set(data.map(row => Number(row[columns[1]])))].sort((a, b) => a - b);
    
    // Create a 2D grid of z-values
    const grid = new Array(yValues.length).fill(0).map(() => new Array(xValues.length).fill(null));
    
    // Fill the grid with available data
    data.forEach(row => {
      const x = Number(row[columns[0]]);
      const y = Number(row[columns[1]]);
      const z = Number(row[columns[2]]);
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        const xIndex = xValues.indexOf(x);
        const yIndex = yValues.indexOf(y);
        
        if (xIndex !== -1 && yIndex !== -1) {
          grid[yIndex][xIndex] = z;
        }
      }
    });
    
    // Interpolate missing values (simple nearest neighbor)
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] === null) {
          // Try to find a nearby value
          let nearbySum = 0;
          let nearbyCount = 0;
          
          // Check neighbors in a small window
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di;
              const nj = j + dj;
              
              if (ni >= 0 && ni < grid.length && 
                  nj >= 0 && nj < grid[i].length && 
                  grid[ni][nj] !== null) {
                nearbySum += grid[ni][nj];
                nearbyCount++;
              }
            }
          }
          
          // Set to average or default value
          grid[i][j] = nearbyCount > 0 ? nearbySum / nearbyCount : 0;
        }
      }
    }
    
    // Format data for ECharts surface
    const surfaceData = [];
    for (let i = 0; i < yValues.length; i++) {
      for (let j = 0; j < xValues.length; j++) {
        surfaceData.push([xValues[j], yValues[i], grid[i][j]]);
      }
    }
    
    return {
      title: { text: '3D Surface Chart' },
      tooltip: {},
      xAxis3D: {
        type: 'value',
        name: columns[0]
      },
      yAxis3D: {
        type: 'value',
        name: columns[1]
      },
      zAxis3D: {
        type: 'value',
        name: columns[2]
      },
      grid3D: {
        viewControl: {
          projection: 'perspective',
          autoRotate: false
        },
        light: {
          main: {
            shadow: true,
            intensity: 1.5
          },
          ambient: {
            intensity: 0.8
          }
        }
      },
      visualMap: {
        show: true,
        dimension: 2,
        min: Math.min(...surfaceData.map(item => item[2])),
        max: Math.max(...surfaceData.map(item => item[2])),
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', 
                 '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      series: [{
        type: 'surface',
        data: surfaceData,
        shading: 'realistic',
        wireframe: {
          show: false
        }
      }]
    };
  };  // Map Chart
  const createMapChart = (data: any[], columns: string[]) => {
    const mapData = data.map(row => ({
      name: row[columns[0]],
      value: Number(row[columns[1]])
    }));
  
    return {
      title: { text: 'Map Chart' },
      visualMap: {
        min: 0,
        max: Math.max(...mapData.map(d => d.value)),
        text: ['High', 'Low'],
        calculable: true
      },
      series: [{
        type: 'map',
        map: 'world',
        data: mapData
      }]
    };
  };
  
  // Graph Chart
  const createGraph = (data: any[], columns: string[]) => {
    const nodes = [...new Set(data.map(row => row[columns[0]]))].map(name => ({
      name: String(name)
    }));
  
    const links = data.map(row => ({
      source: String(row[columns[0]]),
      target: String(row[columns[1]]),
      value: Number(row[columns[2]] || 1)
    }));
  
    return {
      title: { text: 'Graph' },
      tooltip: {},
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        roam: true,
        label: { show: true },
        force: { repulsion: 100 }
      }]
    };
  };
  
  // Liquid Fill Chart
  const createLiquid = (data: any[], columns: string[]) => {
    const value = Number(data[0][columns[0]]) / 100; // Convert to decimal
  
    return {
      title: { text: 'Liquid Fill' },
      series: [{
        type: 'liquidFill',
        data: [value],
        label: {
          formatter: (value * 100).toFixed(0) + '%'
        }
      }]
    };
  };
  
  // Parallel Chart
  const createParallel = (data: any[], columns: string[]) => {
    const schema = columns.map((col, i) => ({
      dim: i,
      name: col
    }));
  
    const parallelData = data.map(row => 
      columns.map(col => Number(row[col]))
    );
  
    return {
      title: { text: 'Parallel' },
      parallel: { left: '5%', right: '13%', bottom: '10%', top: '20%' },
      parallelAxis: schema.map(item => ({ dim: item.dim, name: item.name })),
      series: [{
        type: 'parallel',
        data: parallelData
      }]
    };
  };
  
  // Sankey Diagram
  const createSankey = (data: any[], columns: string[]) => {
    const nodes = [...new Set([
      ...data.map(row => row[columns[0]]),
      ...data.map(row => row[columns[1]])
    ])].map(name => ({ name: String(name) }));
  
    const links = data.map(row => ({
      source: String(row[columns[0]]),
      target: String(row[columns[1]]),
      value: Number(row[columns[2]] || 1)
    }));
  
    return {
      title: { text: 'Sankey Diagram' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'sankey',
        data: nodes,
        links: links,
        emphasis: {
          focus: 'adjacency'
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5
        }
      }]
    };
  };
  
  // Sunburst Chart
  const createSunburst = (data: any[], columns: string[]) => {
    const buildHierarchy = (data: any[], level: number = 0): any[] => {
      if (level >= columns.length - 1) return [];
  
      const grouped = new Map();
      data.forEach(row => {
        const key = row[columns[level]];
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key).push(row);
      });
  
      return Array.from(grouped).map(([key, children]) => ({
        name: String(key),
        value: children.length,
        children: buildHierarchy(children, level + 1)
      }));
    };
  
    const sunburstData = buildHierarchy(data);
  
    return {
      title: { text: 'Sunburst Chart' },
      series: [{
        type: 'sunburst',
        data: sunburstData,
        radius: ['20%', '90%'],
        emphasis: {
          focus: 'ancestor'
        },
        levels: [{}, {
          r0: '20%',
          r: '45%',
          itemStyle: {
            borderRadius: 5
          }
        }, {
          r0: '45%',
          r: '72%',
          label: {
            rotate: 'tangential'
          }
        }, {
          r0: '72%',
          r: '90%',
          label: {
            position: 'outside',
            padding: 3,
            silent: false
          }
        }]
      }]
    };
  };
  
  // Main chart creation function that handles all chart types
  const createChart = (type: string, data: any[], columns: string[], options: any = {}) => {
    // Input validation
    if (!data || !columns || columns.length === 0) {
      throw new Error('Invalid input data or columns');
    }
  
    // Chart type mapping
    const chartCreators: { [key: string]: Function } = {
      'line': createLineChart,
      'bar': createBarChart,
      'pie': createPieChart,
      'scatter': createScatterChart,
      'box': createBoxPlot,
      'histogram': (data: any[], columns: string[]) => 
        createHistogram(data, columns, options.binSize || 10),
      'segmented-bar': createBarChart,
      'effect-scatter': createEffectScatter,
      'funnel': createFunnel,
      'gauge': createGauge,
      'heatmap': createHeatmap,
      'kline': createKLine,
      'radar': createRadar,
      'treemap': createTreeMap,
      'surface3d': create3DSurfaceChart,  // Fixed: Use the correct function name
      'bar3d': create3DBarChart,          // Fixed: Use the correct function name
      'line3d': create3DLineChart,        // Fixed: Use the correct function name
      'scatter3d': create3DScatterChart,  // Fixed: Use the correct function name
      'map': createMapChart,
      'graph': createGraph,
      'liquid': createLiquid,
      'parallel': createParallel,
      'sankey': createSankey,
      'sunburst': createSunburst,
    };
    // Get the appropriate chart creator function
    const chartCreator = chartCreators[type];
    if (!chartCreator) {
      throw new Error(`Unsupported chart type: ${type}`);
    }
  
    // Create the base chart configuration
    const chartConfig = chartCreator(data, columns);
  
    // Add common configuration options
    const commonConfig = {
      backgroundColor: '#fff',
      animation: true,
      tooltip: {
        ...chartConfig.tooltip,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#ccc',
        borderWidth: 1,
        padding: 10,
        textStyle: {
          color: '#333'
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {},
          dataView: {},
          restore: {},
          dataZoom: {
            yAxisIndex: 'none'
          },
          magicType: {
            type: ['line', 'bar', 'stack']
          }
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };
  
    // Merge configurations
    return {
      ...commonConfig,
      ...chartConfig,
      // Apply any custom options passed to the function
      ...options
    };
  };
  
  // Example usage with error handling
  const createChartSafely = (
    type: string,
    data: any[],
    columns: string[],
    options: any = {}
  ) => {
    try {
      return createChart(type, data, columns, options);
    } catch (error) {
      console.error(`Error creating ${type} chart:`, error);
      // Return a simple error chart configuration
      return {
        title: {
          text: 'Error Creating Chart',
          subtext: (error as Error).message,
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#ff4d4f'
          }
        }
      };
    }
  };
  
  export {
    createChartSafely as createChart,
    // Export individual chart creators for specific use cases
    createLineChart,
  createBarChart,
  createPieChart,
  createScatterChart,
  createBoxPlot,
  createHistogram,
  createEffectScatter,
  createFunnel,
  createGauge,
  createHeatmap,
  createKLine,
  createRadar,
  createTreeMap,
  create3DSurfaceChart,     
  create3DBarChart,         
  create3DLineChart,        
  create3DScatterChart,     
  createMapChart,
  createGraph,
  createLiquid,
  createParallel,
  createSankey,
  createSunburst
  };