// import React, { useState } from 'react';
// import axios from 'axios';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/components/ui/use-toast';
// import { Search, Loader2, FileJson, FileText } from 'lucide-react';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";

// interface SearchResult {
//   path?: string;
//   key?: string;
//   value?: string;
//   type?: string;
//   attribute?: string;
//   text?: string;
//   tag?: string;
// }

// interface FileSearchProps {
//   fileId: string;
//   userId: string;
//   fileType: 'json' | 'xml';
//   onResultClick?: (path: string) => void;
// }

// const FileSearch: React.FC<FileSearchProps> = ({
//   fileId,
//   userId,
//   fileType,
//   onResultClick
// }) => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
//   const [totalMatches, setTotalMatches] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const { toast } = useToast();

//   const handleSearch = async () => {
//     if (!searchQuery.trim()) {
//       toast({
//         title: "Error",
//         description: "Please enter a search query",
//         variant: "destructive",
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       // Use the appropriate endpoint based on file type
//       const endpoint = fileType === 'json' 
//         ? `/search-json/${userId}/${fileId}`
//         : `/search-xml/${userId}/${fileId}`;
      
//       const response = await axios.post(endpoint, { query: searchQuery });
      
//       setSearchResults(response.data.matches || []);
//       setTotalMatches(response.data.total_matches || 0);
      
//       if (response.data.total_matches === 0) {
//         toast({
//           title: "No matches found",
//           description: `No matches found for "${searchQuery}"`,
//         });
//       }
//     } catch (error: any) {
//       console.error("Search error:", error);
//       toast({
//         title: "Search failed",
//         description: error.response?.data?.error || "An error occurred during search",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle keyboard enter key
//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       handleSearch();
//     }
//   };

//   // Render different results based on file type
//   const renderSearchResults = () => {
//     if (searchResults.length === 0) {
//       return (
//         <div className="text-center py-6 text-gray-500">
//           {loading ? "Searching..." : "No results to display"}
//         </div>
//       );
//     }

//     if (fileType === 'json') {
//       return (
//         <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
//           {searchResults.map((result, index) => (
//             <Card key={index} className="hover:bg-gray-50 cursor-pointer" 
//                   onClick={() => onResultClick && result.path && onResultClick(result.path)}>
//               <CardContent className="p-4">
//                 <div className="text-sm font-medium text-blue-600 mb-1">
//                   Path: {result.path}
//                 </div>
//                 {result.key && (
//                   <div className="text-sm mb-1">
//                     <span className="font-semibold">Key:</span> {result.key}
//                   </div>
//                 )}
//                 {result.value && (
//                   <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
//                     <span className="font-semibold">Value:</span> {result.value}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       );
//     } else {
//       // XML search results
//       return (
//         <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
//           {searchResults.map((result, index) => (
//             <Card key={index} className="hover:bg-gray-50 cursor-pointer"
//                   onClick={() => onResultClick && result.path && onResultClick(result.path)}>
//               <CardContent className="p-4">
//                 <div className="text-sm font-medium text-blue-600 mb-1">
//                   {result.type === 'element' && <span className="text-green-500 mr-1">Element:</span>}
//                   {result.type === 'attribute' && <span className="text-orange-500 mr-1">Attribute:</span>}
//                   {result.type === 'text' && <span className="text-purple-500 mr-1">Text:</span>}
//                   {result.path}
//                 </div>
//                 {result.tag && (
//                   <div className="text-sm mb-1">
//                     <span className="font-semibold">Tag:</span> {result.tag}
//                   </div>
//                 )}
//                 {result.attribute && (
//                   <div className="text-sm mb-1">
//                     <span className="font-semibold">Attribute:</span> {result.attribute}
//                   </div>
//                 )}
//                 {result.text && (
//                   <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
//                     <span className="font-semibold">Content:</span> {result.text}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       );
//     }
//   };

//   // Render search icon based on file type
//   const searchIcon = fileType === 'json' ? 
//     <FileJson className="h-4 w-4 mr-2" /> : 
//     <FileText className="h-4 w-4 mr-2" />;

//   return (
//     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//       <DialogTrigger asChild>
//         <TooltipProvider>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button variant="outline" size="sm" className="ml-2">
//                 {searchIcon}
//                 <Search className="h-4 w-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>
//               <p>Search within {fileType.toUpperCase()} content</p>
//             </TooltipContent>
//           </Tooltip>
//         </TooltipProvider>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[550px]">
//         <DialogHeader>
//           <DialogTitle className="flex items-center">
//             {searchIcon}
//             Search {fileType.toUpperCase()} Content
//           </DialogTitle>
//           <DialogDescription>
//             {fileType === 'json' 
//               ? "Search for keys or values within the JSON content."
//               : "Search for elements, attributes, or text within the XML content."}
//           </DialogDescription>
//         </DialogHeader>
        
//         <div className="flex items-center space-x-2">
//           <Input
//             placeholder={`Search ${fileType.toUpperCase()}...`}
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             onKeyUp={handleKeyPress}
//             className="flex-1"
//           />
//           <Button onClick={handleSearch} disabled={loading}>
//             {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
//             Search
//           </Button>
//         </div>
        
//         {renderSearchResults()}
        
//         {totalMatches > 0 && (
//           <div className="text-sm text-gray-500 mt-4">
//             Found {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
//           </div>
//         )}
        
//         <DialogFooter>
//           <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
//             Close
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default FileSearch;