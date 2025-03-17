"use client";

import { useUser } from "@clerk/nextjs";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  Paperclip,
  Download,
  FileText,
  Database,
  BarChart,
  AlertCircle,
  Book,
  Settings,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bot,
  Code,
  Search,
  Coffee,
  Terminal,
  Zap,
  Sparkles,
  ImageIcon,
  ExternalLink,
  Minus,
  Plus,
  History,
  XCircle,
  Save,
  Archive,
  Trash2
} from 'lucide-react';

// UI components
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";

// Define interfaces
interface ExistingFile {
  file_id: number;
  filename: string;
  file_type: string;
  is_structured: boolean;
  created_at: string;
  unique_key: string;
  supported_by_insightai: boolean;
}

interface SelectedFile {
  type: 'new' | 'existing';
  file?: File;
  fileId?: number;
  fileType?: string;
  fileName?: string;
}

interface AnalysisConfig {
  generateReport: boolean;
  questionCount: number;
}

interface AnalysisResult {
  success: boolean;
  output: string;
  visualizations?: string[];
  report_file?: string;
  is_report?: boolean;
}

interface FilePreview {
  columns: string[];
  rows: string[][];
}

interface AgentSection {
  agentName: string;
  modelName: string;
  content: string;
  icon: React.ReactNode;
  order: number;
}

interface VisualizationInfo {
  path: string;
  filename: string;
}

interface SavedReport {
  id: string;
  file_id: number;
  file_name: string;
  visualizations: string[];
  report_file?: string;
  question_count: number;
  created_at: string;
  content?: string; // Optional because we'll fetch this separately
}

// Custom Collapsible Component
interface CollapsibleProps {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Collapsible: React.FC<CollapsibleProps> = ({ 
  children, 
  className = "", 
  open, 
  onOpenChange 
}) => {
  const [isOpen, setIsOpen] = useState(open || false);
  
  useEffect(() => {
    if (open !== undefined && open !== isOpen) {
      setIsOpen(open);
    }
  }, [open, isOpen]);
  
  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenChange) {
      onOpenChange(newState);
    }
  };
  
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && 
            child.type === CollapsibleTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: handleToggle,
            'aria-expanded': isOpen
          });
        }
        if (React.isValidElement(child) && 
            child.type === CollapsibleContent) {
          return isOpen ? child : null;
        }
        return child;
      })}
    </div>
  );
};

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-expanded'?: boolean;
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ 
  children, 
  className = "", 
  ...props 
}) => {
  return (
    <button 
      type="button" 
      className={className} 
      {...props}
    >
      {children}
    </button>
  );
};

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Custom MarkdownImage component for properly rendering images in reports
const MarkdownImage: React.FC<{
  src?: string;
  alt?: string;
}> = ({ src, alt }) => {
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  // Correct image URL if it's a relative path
  const imageUrl = src?.startsWith('http') ? 
    src : 
    src?.startsWith('/') ? 
      `http://localhost:5000${src}` : 
      `http://localhost:5000/${src}`;

  return (
    <>
      <div className="my-4 relative border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative w-full h-64">
          <Image
            src={imageUrl || '/placeholder.png'}
            alt={alt || 'Visualization'}
            fill
            className="object-contain"
          />
          <button 
            className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors"
            onClick={() => setShowFullScreen(true)}
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
        {alt && (
          <div className="text-center text-sm text-muted-foreground py-2 px-2">{alt}</div>
        )}
      </div>
      
      {showFullScreen && (
        <Dialog open={showFullScreen} onOpenChange={setShowFullScreen}>
          <DialogContent className="max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle>{alt || 'Visualization'}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[60vh]">
              <Image
                src={imageUrl || '/placeholder.png'}
                alt={alt || 'Visualization'}
                fill
                className="object-contain"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Agent Box Component
const AgentBox: React.FC<{ section: AgentSection }> = ({ section }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible 
      className="w-full border rounded-lg my-2 overflow-hidden"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <div className="flex items-center space-x-2">
          {section.icon}
          <div>
            <h3 className="font-medium">{section.agentName}</h3>
            <p className="text-sm text-muted-foreground">Model: {section.modelName}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 bg-gray-50 dark:bg-gray-800 border-t">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ node, ...props }) => (
                <MarkdownImage src={props.src} alt={props.alt} />
              )
            }}
          >
            {section.content}
          </ReactMarkdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Visualization Gallery Component
const VisualizationGallery: React.FC<{
  visualizations: string[];
}> = ({ visualizations }) => {
  if (!visualizations || visualizations.length === 0) return null;
  
  const visualizationItems: VisualizationInfo[] = visualizations.map(path => ({
    path,
    filename: path.split('/').pop() || path
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visualizationItems.map((viz, index) => (
        <MarkdownImage 
          key={index}
          src={viz.path}
          alt={viz.filename.replace(/\.(png|jpg|jpeg|gif)$/i, '').replace(/_/g, ' ')}
        />
      ))}
    </div>
  );
};

// Enhanced function to parse output and extract visualizations better
const parseAgentSections = (output: string): {
  sections: AgentSection[];
  visualizationPaths: string[];
} => {
  // Regular expressions to identify agent sections
  const agentRegex = /Calling Model: ([^\n]+)\n\n([\s\S]*?)(?=Calling Model:|I now have the final answer:|Generated Code:|Chain Summary|$)/g;
  
  const sections: AgentSection[] = [];
  const visualizationPaths: string[] = [];
  let match;
  
  // Extract visualization paths from code more comprehensively
  // Check for plt.savefig calls
  const vizPathRegex = /plt\.savefig\(['"](\[visualization\][\/\\][^'"]+)['"]\)/g;
  let vizMatch;
  while ((vizMatch = vizPathRegex.exec(output)) !== null) {
    const path = vizMatch[1].replace('[visualization]/', 'visualization/');
    visualizationPaths.push(path);
  }
  
  // Also look for file paths mentioned in the output
  const vizFilePathRegex = /saved (?:to|as) ['"]?([^'"\s]+\.(?:png|jpg|jpeg|svg))['"]?/gi;
  while ((vizMatch = vizFilePathRegex.exec(output)) !== null) {
    const path = vizMatch[1];
    const formattedPath = path.includes('visualization/') ? path : `visualization/${path.split('/').pop()}`;
    visualizationPaths.push(formattedPath);
  }
  
  // Check for explicit mentions of visualization files
  const explicitVizRegex = /visualization\/[^'")\s]+\.(?:png|jpg|jpeg|svg)/g;
  while ((vizMatch = explicitVizRegex.exec(output)) !== null) {
    visualizationPaths.push(vizMatch[0]);
  }
  
  // Find all agent sections
  while ((match = agentRegex.exec(output)) !== null) {
    const modelName = match[1].trim();
    let agentName = "Agent";
    let content = match[2].trim();
    let icon = <Bot className="h-5 w-5" />;
    let order = 100; // Default order (will be sorted later)
    
    // Extract agent name from the content and assign order
    if (content.includes("Selecting the expert")) {
      agentName = "Expert Selector";
      icon = <Search className="h-5 w-5 text-blue-500" />;
      order = 1;
    } else if (content.includes("selecting the best analyst")) {
      agentName = "Analyst Selector";
      icon = <Zap className="h-5 w-5 text-yellow-500" />;
      order = 2;
    } else if (content.includes("Drafting a plan")) {
      agentName = "Planner";
      icon = <Coffee className="h-5 w-5 text-amber-500" />;
      order = 3;
    } else if (content.includes("generating the first version of the code")) {
      agentName = "Code Generator";
      icon = <Code className="h-5 w-5 text-green-500" />;
      order = 5;
    } else if (content.includes("reviewing and debugging")) {
      agentName = "Code Debugger";
      icon = <Terminal className="h-5 w-5 text-red-500" />;
      order = 6;
    } else if (content.includes("assess, summarize and rank")) {
      agentName = "Solution Summarizer";
      icon = <Sparkles className="h-5 w-5 text-purple-500" />;
      order = 7;
    } else if (content.startsWith("{")) {
      // JSON response - could be Expert or Analyst selector
      if (content.includes("expert")) {
        agentName = "Expert Selector Response";
        icon = <Search className="h-5 w-5 text-blue-500" />;
        order = 1;
      } else if (content.includes("analyst")) {
        agentName = "Analyst Selector Response";
        icon = <Zap className="h-5 w-5 text-yellow-500" />;
        order = 2;
      }
    }
    
    sections.push({
      agentName,
      modelName,
      content,
      icon,
      order
    });
  }
  
  // Look for summary section
  const summaryRegex = /I now have the final answer:([\s\S]*?)(?=Here is the final code|$)/;
  const summaryMatch = summaryRegex.exec(output);
  if (summaryMatch) {
    sections.push({
      agentName: "Analysis Summary",
      modelName: "InsightAI",
      content: summaryMatch[1].trim(),
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      order: 4
    });
  }
  
  // Look for final code section
  const codeRegex = /Here is the final code that accomplishes the task:([\s\S]*?)(?=Chain Summary|$)/;
  const codeMatch = codeRegex.exec(output);
  if (codeMatch) {
    const codeContent = codeMatch[1].trim();
    sections.push({
      agentName: "Generated Code",
      modelName: "InsightAI",
      content: "```python\n" + codeContent + "\n```",
      icon: <Code className="h-5 w-5 text-green-500" />,
      order: 8
    });
    
    // Extract additional visualization paths from the code section
    const vizPathRegex = /['"](visualization\/[^'"]+)['"]/g;
    let vizMatch;
    while ((vizMatch = vizPathRegex.exec(codeContent)) !== null) {
      visualizationPaths.push(vizMatch[1]);
    }
  }
  
  // Look for chain summary
  const chainRegex = /Chain Summary[\s\S]*?$/;
  const chainMatch = chainRegex.exec(output);
  if (chainMatch) {
    const summaryText = chainMatch[0].replace(/Chain Summary[\s\S]*?:/, '').trim();
    sections.push({
      agentName: "Execution Summary",
      modelName: "InsightAI Stats",
      content: summaryText,
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
      order: 9
    });
  }
  
  // Remove duplicate visualization paths
  const uniqueVisualizationPaths = [...new Set(visualizationPaths)];
  
  return { sections, visualizationPaths: uniqueVisualizationPaths };
};

// Function to fix image paths in markdown content
const fixMarkdownImagePaths = (content: string): string => {
  if (!content) return '';
  
  // Replace relative image paths with absolute URLs
  return content.replace(
    /!\[(.*?)\]\((visualization\/[^)]+)\)/g,
    (match, alt, path) => {
      return `![${alt}](/visualization/${path.replace('visualization/', '')})`;
    }
  );
};

// File Selection Component
const FileSelector: React.FC<{
  userId: string | undefined;
  onFileSelect: (file: SelectedFile | null) => void;
}> = ({ userId, onFileSelect }) => {
  const [files, setFiles] = useState<ExistingFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch existing files when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:5000/list_files/${userId}`);
        setFiles(response.data.files.filter((f: ExistingFile) => 
          f.file_type === 'csv' || f.file_type === 'db' || 
          f.file_type === 'sqlite' || f.file_type === 'sqlite3'
        ));
      } catch (err: any) {
        console.error('Error fetching files:', err);
        setError('Failed to load existing files: ' + (err.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchFiles();
    }
  }, [userId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !userId) return;
    
    const file = event.target.files[0];
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    // Check if file type is supported
    if (!['csv', 'db', 'sqlite', 'sqlite3'].includes(fileType || '')) {
      setError('Unsupported file type. Please upload CSV or SQLite database files.');
      return;
    }
    
    setUploadingFile(true);
    setUploadProgress(0);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Upload with progress tracking
      const response = await axios.post(
        `http://localhost:5000/upload/${userId}`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );
            setUploadProgress(percentCompleted);
          }
        }
      );
      
      if (response.data.file_id) {
        // Successfully uploaded
        setUploadProgress(100);
        
        // Refresh file list
        const filesResponse = await axios.get(`http://localhost:5000/list_files/${userId}`);
        setFiles(filesResponse.data.files.filter((f: ExistingFile) => 
          f.file_type === 'csv' || f.file_type === 'db' || 
          f.file_type === 'sqlite' || f.file_type === 'sqlite3'
        ));
        
        // Select the newly uploaded file
        const newFile: SelectedFile = {
          type: 'existing',
          fileId: response.data.file_id,
          fileType: fileType || '',
          fileName: file.name
        };
        
        onFileSelect(newFile);
        
        // Show preview if available
        if (response.data.preview) {
          setFilePreview(response.data.preview);
        }
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file: ' + (err.response?.data?.error || err.message || 'Unknown error'));
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Data Source</CardTitle>
        <CardDescription>Upload a new file or select from your existing files</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload New File</TabsTrigger>
            <TabsTrigger value="existing">Existing Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload CSV or Database File</Label>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.db,.sqlite,.sqlite3"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
                {uploadingFile && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-sm text-muted-foreground">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="existing" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : files.length > 0 ? (
              <Select onValueChange={(value) => {
                const selectedFile = files.find(f => f.file_id.toString() === value);
                if (selectedFile) {
                  onFileSelect({
                    type: 'existing',
                    fileId: selectedFile.file_id,
                    fileType: selectedFile.file_type,
                    fileName: selectedFile.filename
                  });
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem key={file.file_id} value={file.file_id.toString()}>
                      <div className="flex items-center">
                        {file.file_type === 'csv' ? (
                          <FileText className="h-4 w-4 mr-2" />
                        ) : (
                          <Database className="h-4 w-4 mr-2" />
                        )}
                        {file.filename} ({file.file_type})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center p-4 border rounded-lg">
                <p className="text-muted-foreground">No files available. Upload a new file to get started.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {filePreview && (
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Data Preview</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {filePreview.columns.map((col, idx) => (
                      <th 
                        key={idx}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filePreview.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Improved Number Selector Component
const NumberSelector: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}> = ({ value, onChange, min = 1, max = 10 }) => {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };
  
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };
  
  return (
    <div className="flex items-center space-x-2 border rounded-md p-1">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleDecrement}
        disabled={value <= min}
        className="h-8 w-8 p-0 flex items-center justify-center"
      >
        <Minus className="h-3 w-3" />
      </Button>
      
      <div className="flex-1 text-center font-medium min-w-[40px]">
        {value}
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleIncrement}
        disabled={value >= max}
        className="h-8 w-8 p-0 flex items-center justify-center"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Report Item Component
const ReportItem: React.FC<{
  report: SavedReport;
  onSelect: () => void;
  isSelected: boolean;
  onDelete: () => void;
}> = ({ report, onSelect, isSelected, onDelete }) => {
  // Format the date for display
  const formattedDate = new Date(report.created_at).toLocaleString();
  
  return (
    <div 
      className={`p-4 border rounded-lg mb-3 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      <div>
        <div className="flex items-center space-x-2">
          <Book className="h-4 w-4 text-blue-500" />
          <h3 className="font-medium">{report.file_name}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          Generated on {formattedDate}
        </div>
        <div className="text-sm text-muted-foreground">
          {report.question_count} questions analyzed
        </div>
      </div>
      <div className="flex items-center">
        {report.visualizations.length > 0 && (
          <Badge className="mr-2" variant="outline">
            {report.visualizations.length} visualization{report.visualizations.length !== 1 ? 's' : ''}
          </Badge>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

// Analysis Configuration Component
const AnalysisConfig: React.FC<{
  onConfigChange: (config: AnalysisConfig) => void;
}> = ({ onConfigChange }) => {
  const [generateReport, setGenerateReport] = useState(false);
  const [questionCount, setQuestionCount] = useState(3);
  
  useEffect(() => {
    onConfigChange({
      generateReport,
      questionCount
    });
  }, [generateReport, questionCount, onConfigChange]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Options</CardTitle>
        <CardDescription>Configure how you want to analyze your data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="generate-report" 
              checked={generateReport}
              onCheckedChange={(checked) => setGenerateReport(checked === true)}
            />
            <label 
              htmlFor="generate-report" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Generate Comprehensive Report
            </label>
          </div>
          
          {generateReport && (
            <div className="pl-6 space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="question-count" className="min-w-[180px]">
                  Number of Questions to Explore:
                </Label>
                <div className="flex-1 max-w-[120px]">
                  <NumberSelector
                    value={questionCount}
                    onChange={setQuestionCount}
                    min={1}
                    max={10}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                More questions will provide deeper insights but will take longer to process.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Analysis Panel Component with improved report management
const AnalysisPanel: React.FC<{
  userId: string | undefined;
  selectedFile: SelectedFile | null;
  config: AnalysisConfig;
}> = ({ userId, selectedFile, config }) => {
  const [question, setQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [agentSections, setAgentSections] = useState<AgentSection[]>([]);
  const [extractedVisualizations, setExtractedVisualizations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'reports'>('analysis');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportContent, setSelectedReportContent] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  
  // Fetch saved reports when userId changes or when activeTab changes to 'reports'
  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) return;
      
      setIsLoadingReports(true);
      try {
        const response = await axios.get(`http://localhost:5000/list_reports/${userId}`);
        if (response.data.success) {
          setSavedReports(response.data.reports);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setIsLoadingReports(false);
      }
    };
    
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [userId, activeTab]);
  
  // Reset states when selected file changes
  useEffect(() => {
    setQuestion('');
    setResult(null);
    setError(null);
    setReportContent(null);
    setAgentSections([]);
    setExtractedVisualizations([]);
    setActiveTab('analysis');
    setSelectedReportId(null);
    setSelectedReportContent(null);
  }, [selectedFile]);
  
  // Parse agent sections and visualizations when result changes
  useEffect(() => {
    if (result && result.output && !result.is_report) {
      const { sections, visualizationPaths } = parseAgentSections(result.output);
      setAgentSections(sections);
      
      // Combine manually extracted visualization paths with those returned from API
      const allVisualizations = [
        ...(result.visualizations || []),
        ...visualizationPaths
      ];
      
      // Remove duplicates and filter out any empty strings
      const uniqueVisualizations = [...new Set(allVisualizations)].filter(path => path);
      
      // Ensure all paths have proper prefix
      const formattedVisualizations = uniqueVisualizations.map(path => {
        if (path.startsWith('http')) return path;
        return path.startsWith('/') ? path : `/${path}`;
      });
      
      setExtractedVisualizations(formattedVisualizations);
    } else if (result && result.is_report) {
      // For report responses, just use the visualizations from the API
      setExtractedVisualizations(result.visualizations || []);
    }
  }, [result]);
  
  // Fetch report content when selectedReportId changes
  useEffect(() => {
    const fetchReportContent = async () => {
      if (!userId || !selectedReportId) {
        setSelectedReportContent(null);
        return;
      }
      
      try {
        const response = await axios.get(`http://localhost:5000/get_report/${userId}/${selectedReportId}`);
        if (response.data.success) {
          setSelectedReportContent(response.data.content);
        }
      } catch (err) {
        console.error('Error fetching report content:', err);
        setSelectedReportContent(null);
      }
    };
    
    fetchReportContent();
  }, [userId, selectedReportId]);
  
  // Process and fix image paths in report content
  useEffect(() => {
    if (reportContent) {
      const fixedContent = fixMarkdownImagePaths(reportContent);
      if (fixedContent !== reportContent) {
        setReportContent(fixedContent);
      }
    }
  }, [reportContent]);

  // Save the current report to the database
  const saveReport = async () => {
    if (!userId || !selectedFile || !selectedFile.fileId || !selectedFile.fileName || !reportContent) {
      return;
    }
    
    setIsSavingReport(true);
    try {
      const response = await axios.post(`http://localhost:5000/save_report/${userId}/${selectedFile.fileId}`, {
        content: reportContent,
        fileName: selectedFile.fileName,
        visualizations: extractedVisualizations,
        reportFile: result?.report_file,
        questionCount: config.questionCount
      });
      
      if (response.data.success) {
        // Show success message or notification
        console.log('Report saved successfully!');
        
        // Update reports list if we're in the reports tab
        if (activeTab === 'reports') {
          const reportsResponse = await axios.get(`http://localhost:5000/list_reports/${userId}`);
          if (reportsResponse.data.success) {
            setSavedReports(reportsResponse.data.reports);
          }
        }
      }
    } catch (err) {
      console.error('Error saving report:', err);
    } finally {
      setIsSavingReport(false);
    }
  };
  
  // Delete a report from the database
  const deleteReport = async (reportId: string) => {
    if (!userId) return;
    
    try {
      const response = await axios.delete(`http://localhost:5000/delete_report/${userId}/${reportId}`);
      if (response.data.success) {
        // Update reports list
        setSavedReports(prevReports => prevReports.filter(report => report.id !== reportId));
        
        // If the deleted report was selected, clear the selection
        if (selectedReportId === reportId) {
          setSelectedReportId(null);
          setSelectedReportContent(null);
        }
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    } finally {
      setShowDeleteConfirm(false);
      setReportToDelete(null);
    }
  };

  const handleAnalysis = async () => {
    if (!userId || !selectedFile || 
        (!question && !config.generateReport) || 
        isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setAgentSections([]);
    setExtractedVisualizations([]);
    setReportContent(null); // Clear previous report content
    setActiveTab('analysis'); // Switch to analysis tab
    
    try {
      // Process the question with the file ID
      if (selectedFile.type === 'existing' && selectedFile.fileId) {
        const response = await axios.post(
          `http://localhost:5000/process_question/${userId}/${selectedFile.fileId}`,
          {
            question: config.generateReport ? '' : question,
            generate_report: config.generateReport,
            report_questions: config.questionCount
          }
        );
        
        if (response.data.success) {
          // Set result based on response - either report or question
          setResult(response.data);
          
          console.log('API Response:', response.data); // Helpful for debugging
          
          // If this is a report or if there's a report file, fetch its content
          if (response.data.is_report || response.data.report_file) {
            try {
              const reportResponse = await axios.get(
                `http://localhost:5000/report/${userId}/${selectedFile.fileId}`
              );
              
              if (reportResponse.data.success && reportResponse.data.report_content) {
                setReportContent(reportResponse.data.report_content);
              }
            } catch (reportErr) {
              console.error("Failed to fetch report content:", reportErr);
            }
          }
          
          // For question responses (not reports), parse the output to extract sections
          if (!response.data.is_report) {
            const { sections, visualizationPaths } = parseAgentSections(response.data.output);
            setAgentSections(sections);
            
            // Combine manually extracted visualization paths with those returned from API
            const allVisualizations = [
              ...(response.data.visualizations || []),
              ...visualizationPaths
            ];
            
            // Remove duplicates and filter out any empty strings
            const uniqueVisualizations = [...new Set(allVisualizations)]
              .filter(path => path);
            
            // Ensure all paths have proper prefix
            const formattedVisualizations = uniqueVisualizations.map(path => {
              if (path.startsWith('http')) return path;
              return path.startsWith('/') ? path : `/${path}`;
            });
            
            setExtractedVisualizations(formattedVisualizations);
          } else {
            // For report responses, just use the visualizations from the API
            setExtractedVisualizations(response.data.visualizations || []);
          }
        } else {
          throw new Error(response.data.error || 'Processing failed');
        }
      } else {
        throw new Error('Invalid file selection');
      }
    } catch (err: any) {
      console.error('Error processing analysis:', err);
      setError(err.response?.data?.error || err.message || 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get the Analysis Summary section if available
  const analysisSummary = agentSections.find(section => section.agentName === "Analysis Summary");
  
  // Sort sections by the order property
  const sortedSections = [...agentSections].sort((a, b) => a.order - b.order);
  
  // Handler for deleting a report with confirmation
  const handleConfirmDelete = (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteConfirm(true);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ask Questions About Your Data</CardTitle>
          <CardDescription>
            {config.generateReport 
              ? "Generate a comprehensive analysis report" 
              : "Ask specific questions about your data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!config.generateReport ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Your Question</Label>
                <div className="flex space-x-2">
                  <Input
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., What are the 5 most expensive phones? Show with a barchart"
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAnalysis}
                    disabled={!question || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">
                  Ask any question about your data.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={handleAnalysis}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating Report...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Generate Comprehensive Report
                  </div>
                )}
              </Button>
              
              <div>
                <p className="text-sm text-muted-foreground">
                  This will generate a comprehensive report with {config.questionCount} insightful questions and visualizations.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Tab navigation for Analysis and Reports */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'analysis' | 'reports')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Current Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Saved Reports {savedReports.length > 0 && `(${savedReports.length})`}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Current Analysis Tab Content */}
        <TabsContent value="analysis">
          {/* Display the ordered agent sections for question responses */}
          {sortedSections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Process</CardTitle>
                <CardDescription>
                  See how InsightAI analyzed your data step by step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Expert Selector */}
                  {sortedSections.filter(section => 
                    section.agentName === "Expert Selector" || 
                    section.agentName === "Expert Selector Response"
                  ).map((section, index) => (
                    <AgentBox key={`expert-${index}`} section={section} />
                  ))}
                  
                  {/* Analyst Selector */}
                  {sortedSections.filter(section => 
                    section.agentName === "Analyst Selector" || 
                    section.agentName === "Analyst Selector Response"
                  ).map((section, index) => (
                    <AgentBox key={`analyst-${index}`} section={section} />
                  ))}
                  
                  {/* Code Generator */}
                  {sortedSections.filter(section => 
                    section.agentName === "Code Generator" ||
                    section.agentName === "Planner"
                  ).map((section, index) => (
                    <AgentBox key={`code-gen-${index}`} section={section} />
                  ))}
                  
                  {/* Summary Results + Plot */}
                  {analysisSummary && (
                    <div className="space-y-4">
                      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                            <Sparkles className="h-5 w-5 mr-2" />
                            Analysis Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {analysisSummary.content}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Visualizations */}
                      {extractedVisualizations.length > 0 && (
                        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                              <ImageIcon className="h-5 w-5 mr-2" />
                              Visualizations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <VisualizationGallery visualizations={extractedVisualizations} />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                  
                  {/* Remaining sections (Code Debugger, Generated Code, Execution Summary) */}
                  {sortedSections.filter(section => 
                    section.agentName !== "Expert Selector" && 
                    section.agentName !== "Expert Selector Response" &&
                    section.agentName !== "Analyst Selector" &&
                    section.agentName !== "Analyst Selector Response" &&
                    section.agentName !== "Code Generator" &&
                    section.agentName !== "Planner" &&
                    section.agentName !== "Analysis Summary"
                  ).map((section, index) => (
                    <AgentBox key={`other-${index}`} section={section} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Full report section */}
          {reportContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Book className="h-5 w-5 mr-2 text-blue-500" />
                  Analysis Report
                </CardTitle>
                <div className="flex justify-between items-center">
                  <CardDescription>
                    Comprehensive analysis of your dataset
                  </CardDescription>
                  <div className="flex space-x-2">
                    {/* Save report button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={saveReport}
                      disabled={isSavingReport}
                    >
                      {isSavingReport ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Report
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowFullReport(!showFullReport)}
                    >
                      {showFullReport ? "Show Summary" : "Show Full Report"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose max-w-none ${!showFullReport ? "max-h-[400px] overflow-y-auto" : ""}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node, ...props }) => (
                        <MarkdownImage src={props.src} alt={props.alt} />
                      )
                    }}
                  >
                    {reportContent}
                  </ReactMarkdown>
                </div>
                
                {/* Download options */}
                {result?.report_file && (
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`http://localhost:5000/${result.report_file}`, '_blank')}
                      className="flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Reports Tab Content */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>
                View previously generated reports for your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="flex justify-center items-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 space-y-4">
                    <h3 className="font-medium">Report List</h3>
                    <div className="max-h-[500px] overflow-y-auto pr-2">
                      {savedReports.length > 0 ? (
                        savedReports.map((report) => (
                          <ReportItem
                            key={report.id}
                            report={report}
                            onSelect={() => setSelectedReportId(report.id)}
                            isSelected={selectedReportId === report.id}
                            onDelete={() => handleConfirmDelete(report.id)}
                          />
                        ))
                      ) : (
                        <div className="text-center p-4 border rounded-lg">
                          <p className="text-muted-foreground">
                            No saved reports yet. Generate a report to get started.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    {selectedReportId ? (
                      selectedReportContent ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium text-lg">
                              {savedReports.find(r => r.id === selectedReportId)?.file_name || 'Report'}
                            </h3>
                            {selectedReportId && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const report = savedReports.find(r => r.id === selectedReportId);
                                  if (report && report.report_file) {
                                    window.open(`http://localhost:5000/${report.report_file}`, '_blank');
                                  }
                                }}
                                disabled={!savedReports.find(r => r.id === selectedReportId)?.report_file}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Report
                              </Button>
                            )}
                          </div>
                          
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                img: ({ node, ...props }) => (
                                  <MarkdownImage src={props.src} alt={props.alt} />
                                )
                              }}
                            >
                              {selectedReportContent}
                            </ReactMarkdown>
                          </div>
                          
                          {/* Visualizations section */}
                          {selectedReportId && (
                            <div className="space-y-2">
                              <h4 className="font-medium">Visualizations</h4>
                              <VisualizationGallery 
                                visualizations={savedReports.find(r => r.id === selectedReportId)?.visualizations || []} 
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground">
                              Loading report content...
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="text-center">
                          <Book className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">
                            Select a report to view its contents
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => reportToDelete && deleteReport(reportToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Component
export default function InsightAIPage() {
  const { user } = useUser();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [config, setConfig] = useState<AnalysisConfig>({
    generateReport: false,
    questionCount: 3
  });
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">
        InsightAI Data Analysis
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <FileSelector 
          userId={user?.id} 
          onFileSelect={setSelectedFile}
        />
        
        {selectedFile && (
          <>
            <div className="bg-muted p-4 rounded-lg flex items-center">
              <div className="mr-2">
                {selectedFile.fileType === 'csv' ? (
                  <FileText className="h-5 w-5" />
                ) : (
                  <Database className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">Selected File: {selectedFile.fileName || 'Unknown file'}</p>
                <p className="text-sm text-muted-foreground">
                  Type: {selectedFile.fileType?.toUpperCase() || 'Unknown'} | 
                  ID: {selectedFile.fileId || 'New file'}
                </p>
              </div>
            </div>
            
            <AnalysisConfig onConfigChange={setConfig} />
            
            <AnalysisPanel 
              userId={user?.id}
              selectedFile={selectedFile}
              config={config}
            />
          </>
        )}
      </div>
    </div>
  );
}