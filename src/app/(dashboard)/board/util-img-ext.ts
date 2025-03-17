// dashboard-utils.ts - Utilities for capturing dashboard nodes as images

/**
 * Captures an HTML element as a PNG image data URL
 * @param element The HTML element to capture
 * @returns Promise resolving to a data URL containing the image
 */
export async function captureElementAsImage(element: HTMLElement): Promise<string> {
    try {
      console.log("Starting element capture...");
      
      // Find and pre-load any images to ensure they render
      const images = element.querySelectorAll('img');
      for (const img of Array.from(images)) {
        // Force image to load or reload
        const src = img.src;
        if (src) {
          img.src = '';
          img.src = src;
        }
      }
      
      // Find any iframes and try to make them capturable
      const iframes = element.querySelectorAll('iframe');
      for (const iframe of Array.from(iframes)) {
        try {
          // Set attributes to help with capturing
          iframe.setAttribute('crossorigin', 'anonymous');
          iframe.style.backgroundColor = 'white'; // Ensure background is visible
        } catch (e) {
          console.warn("Couldn't prepare iframe for capture:", e);
        }
      }
      
      // Wait a moment to let any images finish loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Dynamically import html2canvas to avoid bundling issues
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // Create a canvas from the element with high quality settings
      console.log("Calling html2canvas...");
      const canvas = await html2canvas(element, {
        backgroundColor: 'white', // Use white background to avoid transparency issues
        scale: 2, // Higher scale for better quality
        logging: true, // Enable logging to help debug
        useCORS: true, // Allow cross-origin resources
        allowTaint: true, // Allow tainted canvas
        foreignObjectRendering: false, // Try without this first as it can cause issues
        onclone: (clonedDoc) => {
          // Additional processing on the cloned document if needed
          console.log("Document cloned for capture");
          return clonedDoc;
        }
      });
      
      console.log("Canvas created, converting to data URL...");
      // Convert canvas to a PNG data URL
      const dataUrl = canvas.toDataURL('image/png');
      console.log("Data URL created, length:", dataUrl.length);
      return dataUrl;
    } catch (error) {
      console.error("Error in captureElementAsImage:", error);
      
      // Fallback: Try again with simpler options
      try {
        console.log("Trying fallback capture method...");
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default;
        
        const canvas = await html2canvas(element, {
          backgroundColor: 'white',
          scale: 1,
          logging: true,
          useCORS: false,
          allowTaint: true,
          foreignObjectRendering: false
        });
        
        return canvas.toDataURL('image/png');
      } catch (fallbackError) {
        console.error("Fallback capture also failed:", fallbackError);
        throw error; // Throw the original error
      }
    }
  }
  
  /**
   * Finds all dashboard node elements in the DOM by their type
   * @returns Object containing arrays of different node elements
   */
  export function findNodeElements(): Record<string, HTMLElement[]> {
    console.log("Finding node elements...");
    
    // First try with data-type attributes (ideal case)
    let chartNodes = Array.from(document.querySelectorAll('.react-flow__node[data-type="chartNode"]'));
    let textBoxNodes = Array.from(document.querySelectorAll('.react-flow__node[data-type="textBoxNode"]'));
    let dataTableNodes = Array.from(document.querySelectorAll('.react-flow__node[data-type="dataTableNode"]'));
    let statCardNodes = Array.from(document.querySelectorAll('.react-flow__node[data-type="statCardNode"]'));
    
    // If we don't find nodes with data-type, try alternative approaches
    if (chartNodes.length === 0 && textBoxNodes.length === 0 && 
        dataTableNodes.length === 0 && statCardNodes.length === 0) {
      console.log("No nodes found with data-type attributes, trying alternative selectors");
      
      // Look for nodes by their characteristics (card content, iframe, etc.)
      chartNodes = Array.from(document.querySelectorAll('.react-flow__node:has(iframe)'));
      textBoxNodes = Array.from(document.querySelectorAll('.react-flow__node:has(div[onDoubleClick])'));
      dataTableNodes = Array.from(document.querySelectorAll('.react-flow__node:has(table)'));
      statCardNodes = Array.from(document.querySelectorAll('.react-flow__node:has(.text-3xl)'));
      
      // If :has selector isn't supported or didn't work, try an even more generic approach
      if (chartNodes.length === 0 && textBoxNodes.length === 0 && 
          dataTableNodes.length === 0 && statCardNodes.length === 0) {
        console.log("Still no nodes found, looking for all React Flow nodes");
        
        // Get all nodes and classify them based on inner content (less accurate)
        const allNodes = Array.from(document.querySelectorAll('.react-flow__node')) as HTMLElement[];
        
        allNodes.forEach(node => {
          // Check for characteristics of each node type
          if (node.querySelector('iframe')) {
            chartNodes.push(node);
          } else if (node.querySelector('textarea') || 
                    (node.textContent?.includes('Double-click to edit') ?? false)) {
            textBoxNodes.push(node);
          } else if (node.querySelector('table')) {
            dataTableNodes.push(node);
          } else if (node.querySelector('.text-3xl') || 
                    (node.textContent?.includes('Based on') ?? false)) {
            statCardNodes.push(node);
          } else {
            // If we can't classify, assume it's a chart (most common)
            chartNodes.push(node);
          }
        });
      }
    }
    
    console.log(`Found ${chartNodes.length} charts, ${textBoxNodes.length} text boxes, ` +
                `${dataTableNodes.length} tables, ${statCardNodes.length} stat cards`);
    
    return {
      chartNodes: chartNodes as HTMLElement[],
      textBoxNodes: textBoxNodes as HTMLElement[],
      dataTableNodes: dataTableNodes as HTMLElement[],
      statCardNodes: statCardNodes as HTMLElement[]
    };
  }
  
  /**
   * Captures all dashboard nodes as images
   * @returns Object mapping node keys to image data URLs
   */
  export async function captureDashboardNodes(): Promise<Record<string, string>> {
    const { chartNodes, textBoxNodes, dataTableNodes, statCardNodes } = findNodeElements();
    const nodeImages: Record<string, string> = {};
    const capturePromises: Promise<void>[] = [];
    
    // Process each type of node
    const processNodes = (nodes: HTMLElement[], prefix: string) => {
      nodes.forEach((node, index) => {
        // Try multiple strategies to get the node ID
        let nodeId = node.getAttribute('data-id');
        
        // If no data-id, try id attribute
        if (!nodeId) {
          nodeId = node.id;
        }
        
        // If still no ID, look for a data-nodeid attribute
        if (!nodeId) {
          nodeId = node.getAttribute('data-nodeid');
        }
        
        // If still no ID, check for any attribute containing 'id'
        if (!nodeId) {
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (attr.name.toLowerCase().includes('id')) {
              nodeId = attr.value;
              break;
            }
          }
        }
        
        // If we still don't have an ID, generate one based on the node type and index
        if (!nodeId) {
          nodeId = `${prefix}-${index}`;
        }
        
        console.log(`Capturing ${prefix} node with ID: ${nodeId}`);
        const promise = captureElementAsImage(node)
          .then(imageData => {
            nodeImages[`${prefix}_${nodeId}`] = imageData;
            console.log(`Successfully captured ${prefix}_${nodeId}`);
          })
          .catch(error => {
            console.error(`Failed to capture ${prefix} ${nodeId}:`, error);
          });
        
        capturePromises.push(promise);
      });
    };
    
    // Capture each type of node
    processNodes(chartNodes, 'chart');
    processNodes(textBoxNodes, 'textbox');
    processNodes(dataTableNodes, 'datatable');
    processNodes(statCardNodes, 'statcard');
    
    // Wait for all captures to complete
    await Promise.all(capturePromises);
    
    console.log(`Captured ${Object.keys(nodeImages).length} node images in total`);
    
    return nodeImages;
  }