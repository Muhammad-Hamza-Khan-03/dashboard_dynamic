// layout-templates.ts - Layout templates for AI-generated dashboards

// Define a common interface for all dashboard elements
export interface DashboardElement {
    type: 'chart' | 'textBox' | 'dataTable' | 'statCard';
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
  
  export interface LayoutTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail: string; // Path to thumbnail image or icon name
    generateLayout: (elements: {
      charts: number;
      textBoxes: number;
      dataTables: number;
      statCards: number;
    }, containerWidth?: number, containerHeight?: number) => {
      charts: Array<Omit<DashboardElement, 'type'>>;
      textBoxes: Array<Omit<DashboardElement, 'type'>>;
      dataTables: Array<Omit<DashboardElement, 'type'>>;
      statCards: Array<Omit<DashboardElement, 'type'>>;
    };
  }
  
  // Helper function to create a grid layout
  function createGridLayout(
    elements: {
      charts: number;
      textBoxes: number;
      dataTables: number;
      statCards: number;
    },
    columns: number,
    containerWidth: number = 1200,
    containerHeight: number = 800,
    padding: number = 20
  ): {
    charts: Array<Omit<DashboardElement, 'type'>>;
    textBoxes: Array<Omit<DashboardElement, 'type'>>;
    dataTables: Array<Omit<DashboardElement, 'type'>>;
    statCards: Array<Omit<DashboardElement, 'type'>>;
  } {
    const totalElements = elements.charts + elements.textBoxes + elements.dataTables + elements.statCards;
    const rows = Math.ceil(totalElements / columns);
    
    // Calculate item dimensions
    const itemWidth = (containerWidth - (padding * (columns + 1))) / columns;
    const itemHeight = (containerHeight - (padding * (rows + 1))) / Math.max(rows, 2);
    
    // Initialize result arrays
    const charts: Array<Omit<DashboardElement, 'type'>> = [];
    const textBoxes: Array<Omit<DashboardElement, 'type'>> = [];
    const dataTables: Array<Omit<DashboardElement, 'type'>> = [];
    const statCards: Array<Omit<DashboardElement, 'type'>> = [];
    
    // Place elements in grid
    let elementIndex = 0;
    
    // Place charts first
    for (let i = 0; i < elements.charts; i++) {
      const row = Math.floor(elementIndex / columns);
      const col = elementIndex % columns;
      
      charts.push({
        position: {
          x: padding + col * (itemWidth + padding),
          y: padding + row * (itemHeight + padding),
          width: itemWidth,
          height: itemHeight
        }
      });
      
      elementIndex++;
    }
    
    // Place text boxes
    for (let i = 0; i < elements.textBoxes; i++) {
      const row = Math.floor(elementIndex / columns);
      const col = elementIndex % columns;
      
      textBoxes.push({
        position: {
          x: padding + col * (itemWidth + padding),
          y: padding + row * (itemHeight + padding),
          width: itemWidth,
          height: itemHeight > 200 ? itemHeight : 150 // Text boxes can be smaller
        }
      });
      
      elementIndex++;
    }
    
    // Place data tables
    for (let i = 0; i < elements.dataTables; i++) {
      const row = Math.floor(elementIndex / columns);
      const col = elementIndex % columns;
      
      dataTables.push({
        position: {
          x: padding + col * (itemWidth + padding),
          y: padding + row * (itemHeight + padding),
          width: itemWidth,
          height: itemHeight
        }
      });
      
      elementIndex++;
    }
    
    // Place stat cards
    for (let i = 0; i < elements.statCards; i++) {
      const row = Math.floor(elementIndex / columns);
      const col = elementIndex % columns;
      
      statCards.push({
        position: {
          x: padding + col * (itemWidth + padding),
          y: padding + row * (itemHeight + padding),
          width: itemWidth,
          height: 180 // Stat cards typically have a fixed height
        }
      });
      
      elementIndex++;
    }
    
    return { charts, textBoxes, dataTables, statCards };
  }
  
  // Available layout templates
  export const layoutTemplates: LayoutTemplate[] = [
    // Grid layouts
    {
      id: 'grid-2',
      name: 'Grid (2 columns)',
      description: 'Simple 2-column grid layout',
      thumbnail: 'Grid2',
      generateLayout: (elements, width = 1200, height = 800) => 
        createGridLayout(elements, 2, width, height)
    },
    {
      id: 'grid-3',
      name: 'Grid (3 columns)',
      description: 'Standard 3-column grid layout',
      thumbnail: 'Grid3',
      generateLayout: (elements, width = 1200, height = 800) => 
        createGridLayout(elements, 3, width, height)
    },
    {
      id: 'grid-4',
      name: 'Grid (4 columns)',
      description: 'Dense 4-column grid layout',
      thumbnail: 'Grid4',
      generateLayout: (elements, width = 1200, height = 800) => 
        createGridLayout(elements, 4, width, height)
    },
    
    // Executive dashboard layout
    {
      id: 'executive',
      name: 'Executive Dashboard',
      description: 'Key metrics at the top with detailed charts below',
      thumbnail: 'Executive',
      generateLayout: (elements, width = 1200, height = 800) => {
        const result = {
          charts: [] as Array<Omit<DashboardElement, 'type'>>,
          textBoxes: [] as Array<Omit<DashboardElement, 'type'>>,
          dataTables: [] as Array<Omit<DashboardElement, 'type'>>,
          statCards: [] as Array<Omit<DashboardElement, 'type'>>
        };
        
        const padding = 20;
        
        // Calculate dimensions for stat cards at the top
        const maxStatCards = Math.min(elements.statCards, 4);
        const statCardWidth = (width - ((maxStatCards + 1) * padding)) / maxStatCards;
        
        // Place stat cards in a row at the top
        for (let i = 0; i < maxStatCards; i++) {
          result.statCards.push({
            position: {
              x: padding + i * (statCardWidth + padding),
              y: padding,
              width: statCardWidth,
              height: 180
            }
          });
        }
        
        // Place any remaining stat cards at the end
        for (let i = maxStatCards; i < elements.statCards; i++) {
          result.statCards.push({
            position: {
              x: padding + (i % 4) * (statCardWidth + padding),
              y: height - 180 - padding,
              width: statCardWidth,
              height: 180
            }
          });
        }
        
        // Main content area
        const contentTop = 180 + (padding * 2);
        const contentHeight = height - contentTop - (elements.statCards > maxStatCards ? 180 + (padding * 2) : padding);
        
        // Place title text box at the top-left of content area if available
        if (elements.textBoxes > 0) {
          result.textBoxes.push({
            position: {
              x: padding,
              y: contentTop,
              width: width * 0.3 - (padding * 1.5),
              height: 150
            }
          });
        }
        
        // Place data table below text box or at top-left if no text box
        if (elements.dataTables > 0) {
          result.dataTables.push({
            position: {
              x: padding,
              y: elements.textBoxes > 0 ? contentTop + 150 + padding : contentTop,
              width: width * 0.3 - (padding * 1.5),
              height: contentHeight - (elements.textBoxes > 0 ? 150 + padding : 0)
            }
          });
        }
        
        // Place any additional data tables in bottom row
        for (let i = 1; i < elements.dataTables; i++) {
          result.dataTables.push({
            position: {
              x: padding + (width * 0.3) + ((i-1) % 2) * ((width * 0.7 - padding) / 2),
              y: contentTop + contentHeight * 0.5 + padding,
              width: (width * 0.7 - (padding * 2)) / 2,
              height: contentHeight * 0.5 - (padding * 2)
            }
          });
        }
        
        // Place charts in the main content area (right side)
        const chartWidth = (width * 0.7 - (padding * 2)) / 2;
        const chartHeight = contentHeight * 0.5 - padding;
        
        // Calculate chart grid
        const chartColumns = 2;
        const chartRows = Math.ceil(elements.charts / chartColumns);
        
        // Adjust chart height if we have more than 4 charts
        const adjustedChartHeight = elements.charts > 4
          ? contentHeight / Math.ceil(elements.charts / chartColumns) - padding
          : chartHeight;
        
        for (let i = 0; i < elements.charts; i++) {
          const row = Math.floor(i / chartColumns);
          const col = i % chartColumns;
          
          result.charts.push({
            position: {
              x: padding + (width * 0.3) + col * (chartWidth + padding),
              y: contentTop + row * (adjustedChartHeight + padding),
              width: chartWidth,
              height: adjustedChartHeight
            }
          });
        }
        
        // Place remaining text boxes at the bottom
        for (let i = 1; i < elements.textBoxes; i++) {
          result.textBoxes.push({
            position: {
              x: padding + ((i-1) % 3) * ((width - (padding * 4)) / 3),
              y: height - 150 - padding,
              width: (width - (padding * 4)) / 3,
              height: 150
            }
          });
        }
        
        return result;
      }
    },
    
    // Feature focus layout
    {
      id: 'feature-focus',
      name: 'Feature Focus',
      description: 'One large feature chart with supporting elements',
      thumbnail: 'FeatureFocus',
      generateLayout: (elements, width = 1200, height = 800) => {
        const result = {
          charts: [] as Array<Omit<DashboardElement, 'type'>>,
          textBoxes: [] as Array<Omit<DashboardElement, 'type'>>,
          dataTables: [] as Array<Omit<DashboardElement, 'type'>>,
          statCards: [] as Array<Omit<DashboardElement, 'type'>>
        };
        
        const padding = 20;
        
        // If we have charts, make the first one the feature chart
        if (elements.charts > 0) {
          result.charts.push({
            position: {
              x: padding,
              y: padding,
              width: width * 0.6 - (padding * 1.5),
              height: height * 0.6 - (padding * 1.5)
            }
          });
        }
        
        // Place stat cards in a column on the right
        const statCardHeight = 180;
        const statCardWidth = width * 0.4 - (padding * 1.5);
        
        for (let i = 0; i < elements.statCards; i++) {
          result.statCards.push({
            position: {
              x: width * 0.6 + (padding * 0.5),
              y: padding + i * (statCardHeight + padding),
              width: statCardWidth,
              height: statCardHeight
            }
          });
        }
        
        // Place data table below the feature chart
        if (elements.dataTables > 0) {
          result.dataTables.push({
            position: {
              x: padding,
              y: height * 0.6 + (padding * 0.5),
              width: width * 0.6 - (padding * 1.5),
              height: height * 0.4 - (padding * 1.5)
            }
          });
        }
        
        // Place additional data tables in bottom-right
        for (let i = 1; i < elements.dataTables; i++) {
          result.dataTables.push({
            position: {
              x: width * 0.6 + (padding * 0.5),
              y: padding + (elements.statCards * (statCardHeight + padding)),
              width: statCardWidth,
              height: height - padding - (elements.statCards * (statCardHeight + padding))
            }
          });
          // We only place one additional data table in this layout
          break;
        }
        
        // Place text boxes at available spots
        if (elements.textBoxes > 0) {
          result.textBoxes.push({
            position: {
              x: width * 0.6 + (padding * 0.5),
              y: elements.statCards > 0 
                ? padding + (elements.statCards * (statCardHeight + padding)) 
                : padding,
              width: statCardWidth,
              height: 150
            }
          });
        }
        
        // Place additional text boxes
        for (let i = 1; i < elements.textBoxes; i++) {
          result.textBoxes.push({
            position: {
              x: width * 0.6 + (padding * 0.5),
              y: padding + (elements.statCards * (statCardHeight + padding)) + ((i-1) * (150 + padding)),
              width: statCardWidth,
              height: 150
            }
          });
        }
        
        // Place additional charts in a grid in remaining space
        if (elements.charts > 1) {
          // Calculate available space
          const chartsStartY = height * 0.6 + (padding * 0.5);
          const availableHeight = height - chartsStartY - padding;
          
          // Calculate chart dimensions
          const smallChartWidth = (width * 0.4 - (padding * 2)) / 2;
          const smallChartHeight = availableHeight * 0.5 - (padding * 0.5);
          
          for (let i = 1; i < elements.charts; i++) {
            const row = Math.floor((i-1) / 2);
            const col = (i-1) % 2;
            
            result.charts.push({
              position: {
                x: width * 0.6 + (padding * 0.5) + col * (smallChartWidth + padding),
                y: chartsStartY + row * (smallChartHeight + padding),
                width: smallChartWidth,
                height: smallChartHeight
              }
            });
          }
        }
        
        return result;
      }
    },
    
    // Analytical dashboard layout
    {
      id: 'analytical',
      name: 'Analytical Dashboard',
      description: 'Charts on the left, details on the right for data-heavy analysis',
      thumbnail: 'Analytical',
      generateLayout: (elements, width = 1200, height = 800) => {
        const result = {
          charts: [] as Array<Omit<DashboardElement, 'type'>>,
          textBoxes: [] as Array<Omit<DashboardElement, 'type'>>,
          dataTables: [] as Array<Omit<DashboardElement, 'type'>>,
          statCards: [] as Array<Omit<DashboardElement, 'type'>>
        };
        
        const padding = 20;
        
        // Place text box at the top if available
        if (elements.textBoxes > 0) {
          result.textBoxes.push({
            position: {
              x: padding,
              y: padding,
              width: width - (padding * 2),
              height: 120
            }
          });
        }
        
        const contentTop = elements.textBoxes > 0 ? 120 + (padding * 2) : padding;
        const contentHeight = height - contentTop - padding;
        
        // Place stat cards in a row below the text
        const statCardWidth = (width - ((elements.statCards + 1) * padding)) / elements.statCards;
        const statCardHeight = 180;
        
        if (elements.statCards > 0) {
          for (let i = 0; i < elements.statCards; i++) {
            result.statCards.push({
              position: {
                x: padding + i * (statCardWidth + padding),
                y: contentTop,
                width: statCardWidth,
                height: statCardHeight
              }
            });
          }
        }
        
        const chartsTop = contentTop + (elements.statCards > 0 ? statCardHeight + padding : 0);
        const chartsHeight = contentHeight - (elements.statCards > 0 ? statCardHeight + padding : 0);
        
        // Calculate chart dimensions for a 2x2 grid
        const chartWidth = (width * 0.65 - (padding * 3)) / 2;
        const chartHeight = (chartsHeight - padding) / 2;
        
        // Place charts in a 2x2 grid
        for (let i = 0; i < Math.min(elements.charts, 4); i++) {
          const row = Math.floor(i / 2);
          const col = i % 2;
          
          result.charts.push({
            position: {
              x: padding + col * (chartWidth + padding),
              y: chartsTop + row * (chartHeight + padding),
              width: chartWidth,
              height: chartHeight
            }
          });
        }
        
        // Place additional charts in bottom row
        for (let i = 4; i < elements.charts; i++) {
          result.charts.push({
            position: {
              x: padding + ((i-4) % 3) * ((width - (padding * 4)) / 3),
              y: height - chartHeight - padding,
              width: (width - (padding * 4)) / 3,
              height: chartHeight / 1.5
            }
          });
        }
        
        // Place data table on the right
        if (elements.dataTables > 0) {
          result.dataTables.push({
            position: {
              x: width * 0.65 + (padding * 0.5),
              y: chartsTop,
              width: width * 0.35 - (padding * 1.5),
              height: chartsHeight
            }
          });
        }
        
        // Place additional data tables below
        for (let i = 1; i < elements.dataTables; i++) {
          result.dataTables.push({
            position: {
              x: padding + ((i-1) % 2) * ((width - (padding * 3)) / 2),
              y: height - 300 - padding,
              width: (width - (padding * 3)) / 2,
              height: 300
            }
          });
        }
        
        // Place additional text boxes
        for (let i = 1; i < elements.textBoxes; i++) {
          result.textBoxes.push({
            position: {
              x: width * 0.65 + (padding * 0.5),
              y: chartsTop + chartsHeight - (150 * i) - (padding * (i-1)),
              width: width * 0.35 - (padding * 1.5),
              height: 150
            }
          });
        }
        
        return result;
      }
    }
  ];
  
  // Helper function to find a template by ID
  export const getLayoutTemplateById = (id: string): LayoutTemplate | undefined => {
    return layoutTemplates.find(template => template.id === id);
  };