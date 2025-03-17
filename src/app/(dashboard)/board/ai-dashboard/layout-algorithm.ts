// Enhanced layout algorithm for AI dashboard elements with fixed type compatibility

interface Position {
    x: number;
    y: number;
    width?: number;
    height?: number;
  }
  
  // Use the same interfaces as the AiDashboardModal component
  interface ChartConfig {
    type: string;
    columns: string[];
    title: string;
    description?: string;
    position: Position;
  }
  
  interface TextConfig {
    content: string;
    position: Position;
  }
  
  interface TableConfig {
    columns: string[];
    title: string;
    position: Position;
  }
  
  interface CardConfig {
    column: string;
    statType: string;
    title: string;
    position: Position;
  }
  
  interface AiDashboardConfig {
    charts: ChartConfig[];
    textBoxes: TextConfig[];
    dataTables: TableConfig[];
    statCards: CardConfig[];
  }
  
  /**
   * Intelligently distributes dashboard elements using a grid system
   * to prevent overlapping and ensure proper spacing
   */
  export function smartDistributeElements(config: AiDashboardConfig, containerWidth: number = 1200, containerHeight: number = 800): AiDashboardConfig {
    // Standard element dimensions if not specified
    const defaultDimensions = {
      chart: { width: 400, height: 300 },
      textBox: { width: 300, height: 150 },
      dataTable: { width: 500, height: 300 },
      statCard: { width: 250, height: 150 }
    };
  
    // Define grid settings
    const gridCols = 12;
    const gridRows = 12;
    const cellWidth = containerWidth / gridCols;
    const cellHeight = containerHeight / gridRows;
    
    // Minimum spacing between elements in grid cells
    const minSpacing = 1;
    
    // Track occupied cells
    const occupiedGrid = Array(gridRows).fill(0).map(() => Array(gridCols).fill(false));
    
    // Helper to mark grid cells as occupied
    const occupyCells = (startRow: number, startCol: number, rowSpan: number, colSpan: number) => {
      for (let r = startRow; r < startRow + rowSpan; r++) {
        for (let c = startCol; c < startCol + colSpan; c++) {
          if (r < gridRows && c < gridCols) {
            occupiedGrid[r][c] = true;
          }
        }
      }
    };
    
    // Helper to check if cells are available
    const cellsAvailable = (startRow: number, startCol: number, rowSpan: number, colSpan: number) => {
      // Check if out of grid bounds
      if (startRow + rowSpan > gridRows || startCol + colSpan > gridCols) {
        return false;
      }
      
      // Check each cell in the area
      for (let r = startRow; r < startRow + rowSpan; r++) {
        for (let c = startCol; c < startCol + colSpan; c++) {
          if (occupiedGrid[r][c]) {
            return false;
          }
        }
      }
      
      return true;
    };
    
    // Find next available position for element
    const findNextPosition = (width: number, height: number): Position => {
      // Convert dimensions to grid cells
      const colSpan = Math.ceil(width / cellWidth);
      const rowSpan = Math.ceil(height / cellHeight);
      
      // Try to find a spot starting from top-left
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (cellsAvailable(r, c, rowSpan, colSpan)) {
            // Found a spot, mark as occupied
            occupyCells(r, c, rowSpan, colSpan);
            
            // Return position with actual coordinates
            return {
              x: c * cellWidth + minSpacing * cellWidth / 2,
              y: r * cellHeight + minSpacing * cellHeight / 2,
              width,
              height
            };
          }
        }
      }
      
      // If no perfect spot found, find any spot where it fits width-wise
      // This might overlap with other elements, but at least preserves layout somewhat
      for (let r = 0; r < gridRows; r += rowSpan) {
        for (let c = 0; c < gridCols; c += colSpan) {
          // Find first column that can fit this element
          if (c + colSpan <= gridCols) {
            occupyCells(r, c, rowSpan, colSpan);
            return {
              x: c * cellWidth + minSpacing * cellWidth / 2,
              y: r * cellHeight + minSpacing * cellHeight / 2,
              width,
              height
            };
          }
        }
      }
      
      // Absolute fallback - random position if everything else fails
      return {
        x: Math.random() * (containerWidth - width),
        y: Math.random() * (containerHeight - height),
        width,
        height
      };
    };
    
    // Function to place elements in priority order with strategically important positions
    const placeElements = () => {
      const newConfig: AiDashboardConfig = {
        charts: [],
        textBoxes: [],
        dataTables: [],
        statCards: []
      };
      
      // 1. First place stat cards at the top (typically most important KPIs)
      config.statCards.forEach((element) => {
        const width = element.position.width || defaultDimensions.statCard.width;
        const height = element.position.height || defaultDimensions.statCard.height;
        newConfig.statCards.push({
          ...element,
          position: findNextPosition(width, height)
        });
      });
      
      // 2. Place charts next (typically the main visualizations)
      config.charts.forEach((element) => {
        const width = element.position.width || defaultDimensions.chart.width;
        const height = element.position.height || defaultDimensions.chart.height;
        newConfig.charts.push({
          ...element,
          position: findNextPosition(width, height)
        });
      });
      
      // 3. Place data tables (typically larger and less prioritized)
      config.dataTables.forEach((element) => {
        const width = element.position.width || defaultDimensions.dataTable.width;
        const height = element.position.height || defaultDimensions.dataTable.height;
        newConfig.dataTables.push({
          ...element,
          position: findNextPosition(width, height)
        });
      });
      
      // 4. Place text boxes last (typically explanatory and flexible)
      config.textBoxes.forEach((element) => {
        const width = element.position.width || defaultDimensions.textBox.width;
        const height = element.position.height || defaultDimensions.textBox.height;
        newConfig.textBoxes.push({
          ...element,
          position: findNextPosition(width, height)
        });
      });
      
      return newConfig;
    };
    
    // Place elements and return the new configuration
    return placeElements();
  }
  
  /**
   * Creates a visually balanced dashboard layout inspired by common dashboard patterns
   */
  export function createDashboardLayout(config: AiDashboardConfig, containerWidth: number = 1200, containerHeight: number = 800): AiDashboardConfig {
    // First distribute everything using the smart algorithm
    const distributedConfig = smartDistributeElements(config, containerWidth, containerHeight);
    
    // If we have enough elements, apply some special layouts
    const totalElements = 
      distributedConfig.charts.length + 
      distributedConfig.statCards.length + 
      distributedConfig.dataTables.length + 
      distributedConfig.textBoxes.length;
    
    // Only apply special layouts if we have enough elements
    if (totalElements >= 4) {
      return applySpecialLayouts(distributedConfig, containerWidth, containerHeight);
    }
    
    return distributedConfig;
  }
  
  /**
   * Apply special dashboard layout patterns based on content type
   */
  function applySpecialLayouts(config: AiDashboardConfig, containerWidth: number, containerHeight: number): AiDashboardConfig {
    // Clone the config to avoid mutations
    const newConfig = JSON.parse(JSON.stringify(config)) as AiDashboardConfig;
    
    // Define common layout patterns based on element counts
    const statCardCount = newConfig.statCards.length;
    const chartCount = newConfig.charts.length;
    
    // If we have stat cards, place them in a row at the top
    if (statCardCount > 0) {
      const cardWidth = containerWidth / Math.min(statCardCount, 4);
      const cardHeight = 120;
      
      newConfig.statCards.forEach((card, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        
        card.position = {
          x: col * cardWidth + 10,
          y: row * (cardHeight + 20) + 20,
          width: cardWidth - 20,
          height: cardHeight
        };
      });
      
      // Adjust starting Y position for other elements to account for stat cards
      const statCardRows = Math.ceil(statCardCount / 4);
      const statCardsHeight = statCardRows * (120 + 20) + 20;
      
      // Place charts in a grid below stat cards
      if (chartCount > 0) {
        const chartWidth = containerWidth / Math.min(3, chartCount);
        const chartHeight = 300;
        
        newConfig.charts.forEach((chart, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          
          chart.position = {
            x: col * chartWidth + 10,
            y: statCardsHeight + row * (chartHeight + 20),
            width: chartWidth - 20,
            height: chartHeight
          };
        });
      }
    }
    
    return newConfig;
  }
  
  /**
   * Apply a professional balanced layout using a template approach
   * This creates a more aesthetically pleasing arrangement based on common dashboard patterns
   */
  export function applyTemplateLayout(config: AiDashboardConfig, templateName: string = 'executive', containerWidth: number = 1200, containerHeight: number = 800): AiDashboardConfig {
    // Clone the config to avoid mutations
    const newConfig = JSON.parse(JSON.stringify(config)) as AiDashboardConfig;
    
    switch (templateName) {
      case 'executive': 
        return applyExecutiveTemplate(newConfig, containerWidth, containerHeight);
      case 'analytical':
        return applyAnalyticalTemplate(newConfig, containerWidth, containerHeight);
      case 'balanced':
        return applyBalancedTemplate(newConfig, containerWidth, containerHeight);
      default:
        return smartDistributeElements(config, containerWidth, containerHeight);
    }
  }
  
  /**
   * Executive dashboard template - KPIs at top, big chart in middle, details at bottom
   */
  function applyExecutiveTemplate(config: AiDashboardConfig, width: number, height: number): AiDashboardConfig {
    const newConfig = JSON.parse(JSON.stringify(config)) as AiDashboardConfig;
    const padding = 20;
    
    // 1. Place stat cards in top row
    const statCardCount = Math.min(newConfig.statCards.length, 4);
    if (statCardCount > 0) {
      const cardWidth = (width - (padding * (statCardCount + 1))) / statCardCount;
      const cardHeight = 120;
      
      for (let i = 0; i < statCardCount; i++) {
        if (newConfig.statCards[i]) {
          newConfig.statCards[i].position = {
            x: padding + i * (cardWidth + padding),
            y: padding,
            width: cardWidth,
            height: cardHeight
          };
        }
      }
    }
    
    // 2. Main chart area - largest chart gets the spotlight
    const mainChartTop = statCardCount > 0 ? 120 + padding * 2 : padding;
    const mainChartHeight = 300;
    
    if (newConfig.charts.length > 0) {
      newConfig.charts[0].position = {
        x: padding,
        y: mainChartTop,
        width: width - padding * 2,
        height: mainChartHeight
      };
    }
    
    // 3. Place any remaining charts in a row
    const secondaryChartsTop = mainChartTop + mainChartHeight + padding;
    const secondaryChartWidth = (width - (padding * 4)) / 3;
    const secondaryChartHeight = 250;
    
    for (let i = 1; i < Math.min(newConfig.charts.length, 4); i++) {
      newConfig.charts[i].position = {
        x: padding + ((i-1) % 3) * (secondaryChartWidth + padding),
        y: secondaryChartsTop,
        width: secondaryChartWidth,
        height: secondaryChartHeight
      };
    }
    
    // 4. Place data tables below
    const dataTableTop = secondaryChartsTop + secondaryChartHeight + padding;
    
    if (newConfig.dataTables.length > 0) {
      newConfig.dataTables[0].position = {
        x: padding,
        y: dataTableTop,
        width: width - padding * 2,
        height: 250
      };
    }
    
    // 5. Place text boxes in any remaining space
    const textBoxTop = dataTableTop + (newConfig.dataTables.length > 0 ? 250 + padding : 0);
    const textBoxWidth = (width - (padding * 3)) / 2;
    
    for (let i = 0; i < newConfig.textBoxes.length; i++) {
      newConfig.textBoxes[i].position = {
        x: padding + (i % 2) * (textBoxWidth + padding),
        y: textBoxTop,
        width: textBoxWidth,
        height: 150
      };
    }
    
    return newConfig;
  }
  
  /**
   * Analytical template - more data tables and charts in a detailed grid
   */
  function applyAnalyticalTemplate(config: AiDashboardConfig, width: number, height: number): AiDashboardConfig {
    // Start with smart distribution then apply specific adjustments
    let newConfig = smartDistributeElements(config, width, height);
    
    // Additional analytical customizations could be added here
    
    return newConfig;
  }
  
  /**
   * Balanced template - evenly distributes elements in a grid pattern
   */
  function applyBalancedTemplate(config: AiDashboardConfig, width: number, height: number): AiDashboardConfig {
    const newConfig = JSON.parse(JSON.stringify(config)) as AiDashboardConfig;
    const padding = 20;
    
    // Count total elements
    const totalElements = 
      newConfig.charts.length + 
      newConfig.statCards.length + 
      newConfig.dataTables.length + 
      newConfig.textBoxes.length;
    
    // Calculate grid dimensions
    const cols = Math.min(4, Math.ceil(Math.sqrt(totalElements)));
    const rows = Math.ceil(totalElements / cols);
    
    // Cell dimensions
    const cellWidth = (width - (padding * (cols + 1))) / cols;
    const cellHeight = (height - (padding * (rows + 1))) / rows;
    
    // Place elements in grid order with appropriate sizing
    const allElements: { element: any, type: string }[] = [
      ...newConfig.statCards.map(e => ({ element: e, type: 'statCard' })),
      ...newConfig.charts.map(e => ({ element: e, type: 'chart' })),
      ...newConfig.dataTables.map(e => ({ element: e, type: 'dataTable' })),
      ...newConfig.textBoxes.map(e => ({ element: e, type: 'textBox' }))
    ];
    
    // Assign grid positions
    let index = 0;
    for (let i = 0; i < allElements.length; i++) {
      const item = allElements[i];
      if (item.type === 'placeholder') continue;
      
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // Calculate dimensions based on element type
      let elementWidth = cellWidth;
      let elementHeight = cellHeight;
      
      // Special sizing for important elements
      if (item.type === 'chart' && i < 2) {
        // Make first two charts double width if possible
        if (col < cols - 1 && index + 1 < allElements.length) {
          elementWidth = cellWidth * 2 + padding;
          // Skip the next grid position
          allElements.splice(i + 1, 0, { element: { position: {} }, type: 'placeholder' });
        }
      }
      
      // Apply position
      item.element.position = {
        x: padding + col * (cellWidth + padding),
        y: padding + row * (cellHeight + padding),
        width: elementWidth,
        height: elementHeight
      };
      
      index++;
    }
    
    return newConfig;
  }