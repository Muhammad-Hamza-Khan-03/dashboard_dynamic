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
  const createTextBox = (options: any = {}) => {
    return {
      type: 'custom',
      componentType: 'TextBox',
      data: {
        text: options.text || '',
        position: options.position || { x: 0, y: 0 }
      }
    };
  };
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
  const create3DChart = (type: '3D-bar' | '3D-line' | '3D-scatter', data: any[], columns: string[]) => {
    const data3D = data.map(row => [
      Number(row[columns[0]]),
      Number(row[columns[1]]),
      Number(row[columns[2]])
    ]);
  
    return {
      title: { text: `${type} Chart` },
      grid3D: {},
      xAxis3D: { type: 'value' },
      yAxis3D: { type: 'value' },
      zAxis3D: { type: 'value' },
      series: [{
        type,
        data: data3D
      }]
    };
  };
  
  // Surface 3D
  const createSurface3D = (data: any[], columns: string[]) => {
    // Generate surface data
    const [xSize, ySize] = [50, 50];
    const surfaceData = new Array(xSize).fill(0).map((_, i) => 
      new Array(ySize).fill(0).map((_, j) => {
        const x = i / xSize * 10 - 5;
        const y = j / ySize * 10 - 5;
        const z = Math.sin(Math.sqrt(x * x + y * y));
        return [x, y, z];
      })
    );
  
    return {
      title: { text: 'Surface 3D' },
      tooltip: {},
      series: [{
        type: 'surface',
        data: surfaceData,
        wireframe: {
          show: true
        }
      }]
    };
  };
  
  // Map Chart
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
      'surface3d': createSurface3D,
      'bar3d': (data: any[], columns: string[]) => 
        create3DChart('3D-bar', data, columns),
      'line3d': (data: any[], columns: string[]) => 
        create3DChart('3D-line', data, columns),
      'scatter3d': (data: any[], columns: string[]) => 
        create3DChart('3D-scatter', data, columns),
      'map': createMapChart,
      'graph': createGraph,
      'liquid': createLiquid,
      'parallel': createParallel,
      'sankey': createSankey,
      'sunburst': createSunburst,
    //    'datatable': (data: any[], columns: string[]) => 
    //   createDataTable(data, columns, options),
    // 'numbercard': (data: any[], columns: string[]) => 
    //   createNumberCard(data, columns, options),
    // 'textbox': () => createTextBox(options)
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
    createSurface3D,
    create3DChart,
    createMapChart,
    createGraph,
    createLiquid,
    createParallel,
    createSankey,
    createSunburst
  };