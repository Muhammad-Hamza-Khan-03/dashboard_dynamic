// import React, { useState, useEffect } from 'react';
// import { Button } from "@/components/ui/button";
// import { FileDown, Loader, AlertCircle, Info } from 'lucide-react';
// import EnhancedExportModal from './EnhancedExportModal';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { captureDashboardNodes } from './util-img-ext';

// interface ExportButtonProps {
//   userId: string | undefined;
//   currentDashboardId: string | null;
//   currentDashboardName: string;
//   charts: any[];
//   textBoxes: any[];
//   dataTables: any[];
//   statCards: any[];
//   disabled?: boolean;
//   usePreRendered?: boolean; // New prop to control which export endpoint to use
// }

// /**
//  * Enhanced export button with support for pre-rendered images
//  */
// const EnhancedExportButton: React.FC<ExportButtonProps> = ({
//   userId,
//   currentDashboardId,
//   currentDashboardName,
//   charts,
//   textBoxes,
//   dataTables,
//   statCards,
//   disabled,
//   usePreRendered = true // Default to using pre-rendered images
// }) => {
//   const [showExportModal, setShowExportModal] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);
//   const [exportError, setExportError] = useState<string | null>(null);
//   const [exportProgress, setExportProgress] = useState<string>('');
//   const [hasSavedImages, setHasSavedImages] = useState(false);
  
//   // Check if the current dashboard has saved images
//   useEffect(() => {
//     const checkSavedImages = async () => {
//       if (!userId || !currentDashboardId) return;
      
//       try {
//         const response = await fetch(`http://localhost:5000/check-dashboard-images/${userId}/${currentDashboardId}`);
//         if (response.ok) {
//           const data = await response.json();
//           setHasSavedImages(data.hasSavedImages);
//         }
//       } catch (error) {
//         console.error('Error checking for saved images:', error);
//         // Default to false if there's an error
//         setHasSavedImages(false);
//       }
//     };
    
//     checkSavedImages();
//   }, [userId, currentDashboardId]);

//   const handleExport = async (exportConfig: any) => {
//     if (!userId || !currentDashboardId) return;
    
//     try {
//       setIsExporting(true);
//       setExportError(null);
//       setExportProgress('Preparing export process...');
      
//       // For visual feedback, make sure there's a small delay
//       await new Promise(resolve => setTimeout(resolve, 300));
      
//       // Determine which endpoint to use based on availability of pre-rendered images
//       const endpoint = usePreRendered && hasSavedImages
//         ? `http://localhost:5000/export-dashboard-pre-rendered/${userId}`
//         : `http://localhost:5000/export-dashboard-images/${userId}`;
        
//       setExportProgress(`Using ${usePreRendered && hasSavedImages ? 'pre-rendered' : 'live'} export method...`);
      
//       // If using the original method, we need to capture images on-the-fly
//       if (!usePreRendered || !hasSavedImages) {
//         setExportProgress('Capturing dashboard elements as images...');
        
//         // First, check if html2canvas is available
//         try {
//           await import('html2canvas');
//         } catch (error) {
//           throw new Error("html2canvas library not found. Please run 'npm install html2canvas' first.");
//         }
        
//         // First, capture all dashboard nodes as images
//         const nodeImages = await captureDashboardNodes();
        
//         // Check if we've captured any images
//         if (Object.keys(nodeImages).length === 0) {
//           throw new Error("No dashboard elements could be captured. Please make sure your dashboard is visible.");
//         }
        
//         setExportProgress(`Captured ${Object.keys(nodeImages).length} node images. Sending to server...`);
        
//         // Send the request
//         const requestData = {
//           dashboard_ids: [currentDashboardId],
//           dashboards: [{
//             id: currentDashboardId,
//             name: currentDashboardName
//           }],
//           export_name: exportConfig.exportName,
//           use_relative_positioning: exportConfig.useRelativePositioning,
//           node_images: nodeImages,
//           node_positions: {
//             charts: charts.map(chart => ({
//               id: chart.id,
//               position: chart.position,
//               title: chart.title
//             })),
//             textBoxes: textBoxes.map(box => ({
//               id: box.id,
//               position: box.position,
//               content: box.content
//             })),
//             dataTables: dataTables.map(table => ({
//               id: table.id,
//               position: table.position,
//               title: table.title
//             })),
//             statCards: statCards.map(card => ({
//               id: card.id,
//               position: card.position,
//               title: card.title
//             }))
//           }
//         };
        
//         setExportProgress('Generating PDF on server...');
        
//         const response = await fetch(endpoint, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(requestData),
//         });
        
//         if (!response.ok) {
//           throw new Error(`Export failed (Status: ${response.status})`);
//         }
        
//         const data = await response.json();
//         setExportProgress('PDF generated successfully! Opening download...');
        
//         // Open the download link in a new tab
//         window.open(`http://localhost:5000${data.download_url}`, '_blank');
//       }
//       else {
//         // Using pre-rendered images - simpler request
//         const requestData = {
//           dashboard_ids: [currentDashboardId],
//           dashboards: [{
//             id: currentDashboardId,
//             name: currentDashboardName
//           }],
//           export_name: exportConfig.exportName,
//           use_relative_positioning: exportConfig.useRelativePositioning,
//           // We still need positions for layout
//           node_positions: {
//             charts: charts.map(chart => ({
//               id: chart.id,
//               position: chart.position,
//               title: chart.title
//             })),
//             textBoxes: textBoxes.map(box => ({
//               id: box.id,
//               position: box.position,
//               content: box.content
//             })),
//             dataTables: dataTables.map(table => ({
//               id: table.id,
//               position: table.position,
//               title: table.title
//             })),
//             statCards: statCards.map(card => ({
//               id: card.id,
//               position: card.position,
//               title: card.title
//             }))
//           }
//         };
        
//         setExportProgress('Generating PDF from saved images...');
        
//         const response = await fetch(endpoint, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(requestData),
//         });
        
//         if (!response.ok) {
//           throw new Error(`Export failed (Status: ${response.status})`);
//         }
        
//         const data = await response.json();
//         setExportProgress('PDF generated successfully! Opening download...');
        
//         // Open the download link in a new tab
//         window.open(`http://localhost:5000${data.download_url}`, '_blank');
//       }
      
//       // Reset progress after a short delay
//       setTimeout(() => {
//         setExportProgress('');
//         setShowExportModal(false);
//       }, 1500);
      
//     } catch (error) {
//       console.error('Error during export:', error);
//       setExportError(error instanceof Error ? error.message : 'Unknown error occurred');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   return (
//     <>
//       <Button
//         variant="outline"
//         size="sm"
//         onClick={() => {
//           setExportError(null);
//           setExportProgress('');
//           setShowExportModal(true);
//         }}
//         disabled={disabled || !currentDashboardId || isExporting}
//         className="flex items-center gap-1 relative"
//       >
//         {isExporting ? (
//           <Loader className="h-4 w-4 animate-spin" />
//         ) : (
//           <FileDown className="h-4 w-4" />
//         )}
//         {isExporting ? 'Exporting...' : 'Export'}
        
//         {/* Indicator if we have saved images */}
//         {hasSavedImages && (
//           <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
//         )}
//       </Button>
      
//       {showExportModal && (
//         <EnhancedExportModal
//           isOpen={showExportModal}
//           onClose={() => {
//             if (!isExporting) {
//               setShowExportModal(false);
//               setExportError(null);
//               setExportProgress('');
//             }
//           }}
//           onExport={handleExport}
//           userId={userId}
//           currentDashboardId={currentDashboardId}
//           currentDashboardName={currentDashboardName}
//           charts={charts}
//           textBoxes={textBoxes}
//           dataTables={dataTables}
//           statCards={statCards}
//           isProcessing={isExporting}
//           error={exportError}
//           progress={exportProgress}
//           hasSavedImages={hasSavedImages}
//         />
//       )}
//     </>
//   );
// };

// export default EnhancedExportButton;