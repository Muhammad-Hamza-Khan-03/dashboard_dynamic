"use client";

import { useUser } from "@clerk/nextjs";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
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
  Trash2,
  Table,
  ServerCrash,
  AlignLeft,
  BookOpen,
  Lightbulb,
  Info,
  Server,
  Brain,
  FileJson,
  FileCode,
  Maximize
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
  diagram_enabled: boolean; 
}

interface AnalysisResult {
  success: boolean;
  output: string;
  visualizations?: string[];
  mermaid_diagrams?: string[];
  report_file?: string;
  cleaned_data_file?: string; 
  is_report?: boolean;
}

interface FilePreview {
  columns: string[];
  rows: string[][];
}

interface AgentResponse {
  agent: string;
  chain_id: number;
  timestamp: string;
  model: string;
  content: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  elapsed_time?: number;
  tokens_per_second?: number;
  cost?: number;
}

interface AgentSection {
  agentName: string;
  modelName: string;
  content: string;
  icon: React.ReactNode;
  order: number;
  type?: 'sql' | 'code' | 'summary' | 'explanation' | 'default' | 'sql-results';
  thinking?: string;
}

interface VisualizationInfo {
  path: string;
  filename: string;
}

interface CodeBlock {
  language: string;
  code: string;
}

interface SavedReport {
  id: string;
  file_id: number;
  file_name: string;
  visualizations: string[];
  report_file?: string;
  question_count: number;
  created_at: string;
  content?: string;
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

// Enhanced MarkdownImage component with full-screen and zoom capabilities
const MarkdownImage: React.FC<{
  src?: string;
  alt?: string;
}> = ({ src, alt }) => {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Correct image URL if it's a relative path
  const imageUrl = src?.startsWith('http') ? 
    src : 
    src?.startsWith('/') ? 
      `http://localhost:5000${src}` : 
      `http://localhost:5000/${src}`;

  return (
    <>
      <div className="my-4 relative border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
        <div className="relative w-full h-64">
          {!imageError ? (
            <Image
              src={imageUrl || '/placeholder.png'}
              alt={alt || 'Visualization'}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center p-4">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Image could not be loaded</p>
                <p className="text-xs text-gray-400 mt-1">{imageUrl}</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="p-1.5 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors"
              onClick={() => setShowFullScreen(true)}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
        {alt && (
          <div className="text-center text-sm text-muted-foreground py-2 px-2 border-t">{alt}</div>
        )}
      </div>
      
      {showFullScreen && (
        <Dialog open={showFullScreen} onOpenChange={setShowFullScreen}>
          <DialogContent className="max-w-5xl w-full max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{alt || 'Visualization'}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-900 rounded-md">
              {!imageError ? (
                <Image
                  src={imageUrl || '/placeholder.png'}
                  alt={alt || 'Visualization'}
                  fill
                  className="object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center p-4">
                    <ImageIcon className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">Image could not be loaded</p>
                    <p className="text-sm text-gray-400 mt-1">{imageUrl}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                View Original Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Enhanced custom markdown renderer with better styling and syntax highlighting
const EnhancedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-md prose-h2:border-b prose-h2:pb-1 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-md prose-img:shadow-sm">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Enhanced image component
          img: ({ node, ...props }) => (
            <MarkdownImage src={props.src} alt={props.alt} />
          ),
          
          // Enhanced code block rendering
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return (
                <div className="relative my-4 rounded-md overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-1 text-xs font-mono flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">{language}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                  <SyntaxHighlighter 
                    language={language} 
                    style={nord}
                    customStyle={{ margin: 0, borderRadius: 0 }}
                    showLineNumbers={language === 'python' || language === 'javascript' || language === 'typescript'}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            } else if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 font-mono text-sm" {...props}>
                  {children}
                </code>
              );
            } else {
              // For code blocks without specified language
              return (
                <div className="relative my-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
                  <pre>{children}</pre>
                </div>
              );
            }
          },
          
          // Enhanced table rendering
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 border rounded-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
          ),
          
          // Style table headers
          th: ({ node, ...props }) => (
            <th 
              className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700" 
              {...props} 
            />
          ),
          
          // Style table cells
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-sm whitespace-nowrap border-b border-gray-100 dark:border-gray-800" {...props} />
          ),
          
          // Style paragraphs with proper spacing
          p: ({ node, ...props }) => (
            <p className="leading-relaxed mb-4" {...props} />
          ),
          
          // Style links with proper color and underline
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-600 dark:text-blue-400 hover:underline" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote 
              className="border-l-4 border-blue-200 dark:border-blue-800 pl-4 italic text-gray-600 dark:text-gray-300 my-4" 
              {...props} 
            />
          ),
          
          // Style headings with proper spacing and sizes
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 pb-1 border-b border-gray-200 dark:border-gray-700" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold mt-5 mb-3" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-medium mt-4 mb-2" {...props} />
          ),
          
          // Style lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="mb-1" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// SQL Code Component - Enhanced for SQL-specific formatting
const SqlCode: React.FC<{ sql: string }> = ({ sql }) => {
  // Process SQL for display - clean and format
  const processedSql = sql
    .split(';')
    .filter(statement => statement.trim())
    .map(statement => statement.trim())
    .join(';\n\n');

  // Determine if it's a schema query
  const isSchemaQuery = sql.toLowerCase().includes('sqlite_master');
  
  return (
    <div className="relative">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {isSchemaQuery ? 'Schema Query' : 'SQL Query'}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(sql);
            }}
            className="h-8 px-2"
          >
            <span className="sr-only">Copy code</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                ry="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </Button>
        </div>
        <div className="p-4">
          <SyntaxHighlighter 
            language="sql" 
            style={nord} 
            customStyle={{ 
              margin: 0, 
              background: 'transparent',
              fontSize: '0.9rem',
              color: '#333333',
              fontWeight: 500
            }}
            showLineNumbers={true}
          >
            {processedSql}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};
// SQL Results Component - New component to better display SQL query results
const SqlResults: React.FC<{ content: string }> = ({ content }) => {
  // Extract the table output from SQL results
  const extractTableResults = (text: string) => {
    const resultsPattern = /Results for query:([\s\S]*?)(?=>>|$)/;
    const match = text.match(resultsPattern);
    return match ? match[1].trim() : null;
  };

  const tableResults = extractTableResults(content);
  
  if (!tableResults) {
    return <EnhancedMarkdown content={content} />;
  }

  // Format the table data for better display
  const formatSqlResults = (results: string) => {
    // Check if it's in a pandas-like table format
    if (results.includes('table_name') && results.includes('schema')) {
      try {
        // Split by lines to parse the table
        const lines = results.split('\n').filter(line => line.trim());
        
        // Extract header row (assuming first line after "Results for query:")
        const headerLine = lines.find(line => line.includes('table_name') && line.includes('schema'));
        if (!headerLine) return results;
        
        const headers = ['Table Name', 'Schema'];
        
        // Extract table rows - assuming format is index, table_name, schema
        const rows = lines.filter(line => 
          line.match(/^\d+\s+\S+\s+/)  // Starts with digit followed by whitespace and text
        ).map(line => {
          // Split by first two occurrences of multiple whitespace
          const parts = line.split(/\s{2,}/, 3);
          if (parts.length < 3) return ['', '']; // Skip malformed lines
          
          // Skip the first element (index) and return table_name and schema
          return [parts[1].trim(), parts[2].trim()];
        });
        
        return (
          <div className="overflow-x-auto border rounded-md my-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {headers.map((header, i) => (
                    <th 
                      key={i} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {row[0]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                      {row[1].replace(/\\n/g, '\n')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } catch (error) {
        console.error("Error formatting SQL results:", error);
        return <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-x-auto">{results}</pre>;
      }
    }
    
    // Default formatting if not a table
    return <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-x-auto text-gray-800 dark:text-gray-200">{results}</pre>;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Table className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-blue-700 dark:text-blue-300">SQL Query Results</h3>
        </div>
        {formatSqlResults(tableResults)}
      </div>
    </div>
  );
};

// Database Schema Component
const DatabaseSchemaExplanation: React.FC<{ content: string }> = ({ content }) => {
  // Check if this is a database schema explanation
  const isSchemaExplanation = content.includes('database schema') || 
                              content.includes('Table:') ||
                              (content.includes('table') && content.includes('column'));

  if (!isSchemaExplanation) {
    return <EnhancedMarkdown content={content} />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="font-medium text-green-700 dark:text-green-300">Database Structure</h3>
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold text-gray-800 dark:text-gray-200">
          <EnhancedMarkdown content={content} />
        </div>
      </div>
    </div>
  );
};

// Thinking Process Component
const ThinkingProcess: React.FC<{ thinking: string }> = ({ thinking }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!thinking) return null;
  
  return (
    <div className="mt-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
      >
        {expanded ? 'Hide' : 'Show'} thinking process
        {expanded ? 
          <ChevronUp className="h-4 w-4" /> : 
          <ChevronDown className="h-4 w-4" />
        }
      </button>
      
      {expanded && (
        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-sm whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          {thinking}
        </div>
      )}
    </div>
  );
};

// Enhanced Agent Box Component that properly extracts and displays <think> content
const AgentBox: React.FC<{ section: AgentSection }> = ({ section }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Extract thinking process from the content if present
  const extractContent = (content: string): { mainContent: string, thinking: string | null } => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    const thinking = thinkMatch ? thinkMatch[1].trim() : null;
    
    // Remove <think> section from content
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    
    return { mainContent, thinking };
  };
  
  // Extract code blocks from content
  const extractCodeBlocks = (content: string): { cleanContent: string, codeBlocks: CodeBlock[] } => {
    const codeBlocks: CodeBlock[] = [];
    const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
    let codeMatch;
    
    // Find all code blocks
    while ((codeMatch = codeRegex.exec(content)) !== null) {
      const language = codeMatch[1] || 'plaintext';
      const code = codeMatch[2].trim();
      codeBlocks.push({ language, code });
    }
    
    // Remove code blocks from content
    const cleanContent = content.replace(/```(\w*)\n[\s\S]*?```/g, '');
    
    return { cleanContent, codeBlocks };
  };
  
  const { mainContent, thinking } = extractContent(section.content);
  const { cleanContent, codeBlocks } = extractCodeBlocks(mainContent);
  
  // Determine if content contains SQL-related information
  const isSqlQuery = section.content.includes('SELECT') && section.content.includes('FROM');
  const isSqlResults = section.content.includes('Results for query:');
  const isDatabaseExplanation = section.agentName === "SQL Generator" || 
                               section.content.includes('database schema') || 
                               (section.content.includes('table') && section.content.includes('column'));

  // Assign type if not already specified
  const sectionType = section.type || 
                     (isSqlQuery ? 'sql' : 
                      isSqlResults ? 'sql-results' :
                      isDatabaseExplanation ? 'explanation' : 
                      section.agentName === "Analysis Summary" ? 'summary' : 
                      section.agentName === "Generated Code" ? 'code' : 
                      'default');

  // Get background color based on section type
  const getBgColor = () => {
    switch(sectionType) {
      case 'sql':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'sql-results':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'explanation':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'summary':
        return 'bg-purple-50 dark:bg-purple-900/20';
      case 'code':
        return 'bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <Collapsible 
      className={`w-full border rounded-lg my-2 overflow-hidden ${isOpen ? 'shadow-md' : ''} transition-all`}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <div className="flex items-center space-x-3">
          {section.icon}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{section.agentName}</h3>
            <div className="flex items-center text-xs text-muted-foreground mt-0.5">
              {/* <span>{section.modelName}</span> */}
              {sectionType === 'sql' && (
                <Badge variant="outline" className="ml-2 py-0 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">SQL</Badge>
              )}
              {sectionType === 'sql-results' && (
                <Badge variant="outline" className="ml-2 py-0 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Results</Badge>
              )}
              {sectionType === 'explanation' && (
                <Badge variant="outline" className="ml-2 py-0 h-5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">Schema</Badge>
              )}
              {thinking && (
                <Badge variant="outline" className="ml-2 py-0 h-5">
                  <Brain className="h-3 w-3 mr-1" />
                  Thinking
                </Badge>
              )}
            </div>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className={`p-4 ${getBgColor()} border-t`}>
        {sectionType === 'sql' ? (
          <SqlCode sql={isSqlQuery ? extractSqlQuery(mainContent) : mainContent} />
        ) : sectionType === 'sql-results' ? (
          <SqlResults content={mainContent} />
        ) : sectionType === 'explanation' ? (
          <DatabaseSchemaExplanation content={mainContent} />
        ) : (
          <div className="space-y-4">
            {/* Main content without code blocks */}
            {cleanContent && (
              <EnhancedMarkdown content={cleanContent} />
            )}
            
            {/* Code blocks */}
            {codeBlocks.length > 0 && (
              <div className="space-y-3">
                {codeBlocks.map((block, index) => (
                  <div key={index} className="rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-mono flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {block.language || 'code'}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(block.code);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <path
                            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    </div>
                    <SyntaxHighlighter 
                      language={block.language || 'plaintext'} 
                      style={nord}
                      showLineNumbers={block.language === 'python' || block.language === 'javascript' || block.language === 'typescript' || block.language === 'sql'}
                      customStyle={{ 
                        margin: 0, 
                        fontSize: '0.9rem',
                        color: '#333333',
                        fontWeight: 500
                      }}
                    >
                      {block.code}
                    </SyntaxHighlighter>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Display thinking process */}
        {thinking && <ThinkingProcess thinking={thinking} />}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Extract SQL query from content
const extractSqlQuery = (content: string): string => {
  // Try to extract SQL query from SELECT statement
  const selectMatch = content.match(/SELECT[\s\S]*?FROM[\s\S]*?(;|$)/i);
  if (selectMatch) {
    return selectMatch[0].trim();
  }
  
  // Try to extract from code block
  const codeBlockMatch = content.match(/```sql\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Try to extract generated code section
  const generatedCodeMatch = content.match(/Generated Code:([\s\S]*?)(?=>>|$)/);
  if (generatedCodeMatch) {
    return generatedCodeMatch[1].trim();
  }
  
  // Fallback to the original content
  return content;
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

// Process the agent responses from raw JSON
const processAgentResponses = (responses: AgentResponse[]): AgentSection[] => {
  const sections: AgentSection[] = [];
  
  responses.forEach(response => {
    let agentName = response.agent;
    let icon: React.ReactNode;
    let order = 100;
    let type: 'sql' | 'code' | 'summary' | 'explanation' | 'default' = 'default';
    
    // Process the content to extract thinking and main content
    const thinkMatch = response.content.match(/<think>([\s\S]*?)<\/think>/);
    const thinking = thinkMatch ? thinkMatch[1].trim() : undefined;
    
    // Assign appropriate icon based on agent type
    switch(agentName) {
      case 'Expert Selector':
        icon = <Search className="h-5 w-5 text-blue-500" />;
        order = 1;
        break;
      case 'Analyst Selector':
        icon = <Zap className="h-5 w-5 text-yellow-500" />;
        order = 2;
        break;
      case 'Planner':
        icon = <Coffee className="h-5 w-5 text-amber-500" />;
        order = 3;
        break;
      case 'Code Generator':
        icon = <Code className="h-5 w-5 text-green-500" />;
        type = 'code';
        order = 5;
        break;
      case 'Solution Summarizer':
        icon = <Sparkles className="h-5 w-5 text-purple-500" />;
        type = 'summary';
        order = 7;
        break;
      default:
        icon = <Bot className="h-5 w-5" />;
    }
    
    // Add the section with all extracted information
    sections.push({
      agentName,
      modelName: response.model,
      content: response.content,
      icon,
      order,
      type,
      thinking
    });
  });
  
  // Sort by order
  return sections.sort((a, b) => a.order - b.order);
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
  
  // Find all agent sections
  while ((match = agentRegex.exec(output)) !== null) {
    const modelName = match[1].trim();
    let agentName = "Agent";
    let content = match[2].trim();
    let icon = <Bot className="h-5 w-5" />;
    let order = 100; // Default order (will be sorted later)
    let type: 'sql' | 'sql-results' | 'code' | 'summary' | 'explanation' | 'default' = 'default';
    
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
      
      // Check if this is SQL code generator
      if (content.includes("SELECT") && content.includes("FROM")) {
        type = 'sql';
      } else {
        type = 'code';
      }
    } else if (content.includes("reviewing and debugging")) {
      agentName = "Code Debugger";
      icon = <Terminal className="h-5 w-5 text-red-500" />;
      order = 6;
    } else if (content.includes("assess, summarize and rank")) {
      agentName = "Solution Summarizer";
      icon = <Sparkles className="h-5 w-5 text-purple-500" />;
      order = 7;
      type = 'summary';
    } else if (agentName === "SQL Generator" || content.includes("database schema")) {
      agentName = "SQL Generator";
      icon = <Database className="h-5 w-5 text-blue-500" />;
      type = 'explanation';
      order = 2;
    }
    
    // Handle SQL-specific content
    if (content.includes("Results for query:")) {
      type = 'sql-results';
      agentName = "SQL Results";
      icon = <Table className="h-5 w-5 text-blue-500" />;
      order = 6;
    } else if (content.includes("SELECT") && content.includes("FROM")) {
      if (type !== 'explanation') {  // Don't override explanation type
        type = 'sql';
      }
    }
    
    sections.push({
      agentName,
      modelName,
      content,
      icon,
      order,
      type
    });
  }
  
  // Look for summary section
  const summaryRegex = /I now have the final answer:([\s\S]*?)(?=Here is the final code|Chain Summary|$)/;
  const summaryMatch = summaryRegex.exec(output);
  if (summaryMatch) {
    // Check if it's a SQL result
    const summaryContent = summaryMatch[1].trim();
    
    if (summaryContent.includes("Results for query:")) {
      sections.push({
        agentName: "SQL Results",
        modelName: "Database",
        content: summaryContent,
        icon: <Table className="h-5 w-5 text-blue-500" />,
        order: 6,
        type: 'sql-results'
      });
    } else {
      sections.push({
        agentName: "Analysis Summary",
        modelName: "InsightAI",
        content: summaryContent,
        icon: <Sparkles className="h-5 w-5 text-purple-500" />,
        order: 6,
        type: 'summary'
      });
    }
  }
  
  // Look for final code section - special handling for SQL
  const codeRegex = /Here is the final code that accomplishes the task:([\s\S]*?)(?=Chain Summary|$)/;
  const codeMatch = codeRegex.exec(output);
  if (codeMatch) {
    const codeContent = codeMatch[1].trim();
    
    // Check if this is SQL code
    if (codeContent.includes("SELECT") && codeContent.includes("FROM")) {
      sections.push({
        agentName: "SQL Query",
        modelName: "InsightAI",
        content: codeContent,
        icon: <Database className="h-5 w-5 text-blue-500" />,
        order: 4,
        type: 'sql'
      });
    } else {
      sections.push({
        agentName: "Generated Code",
        modelName: "InsightAI",
        content: "```python\n" + codeContent + "\n```",
        icon: <Code className="h-5 w-5 text-green-500" />,
        order: 8,
        type: 'code'
      });
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
  
  return { sections, visualizationPaths: visualizationPaths };
};

// Function to fix image paths in markdown content
const fixMarkdownImagePaths = (content: string): string => {
  if (!content) return '';
  
  // Replace relative image paths with absolute URLs
  let fixedContent = content.replace(
    /!\[(.*?)\]\((visualization\/[^)]+)\)/g,
    (match, alt, path) => {
      return `![${alt}](/visualization/${path.replace('visualization/', '')})`;
    }
  );
  
  // Also fix paths starting with /visualization/
  fixedContent = fixedContent.replace(
    /!\[(.*?)\]\((\/visualization\/[^)]+)\)/g,
    (match, alt, path) => {
      return `![${alt}](${path})`;
    }
  );
  
  // Fix any paths that don't start with http or /
  fixedContent = fixedContent.replace(
    /!\[(.*?)\]\((?!http|\/)(.*?\.(?:png|jpg|jpeg|gif|svg))\)/g,
    (match, alt, path) => {
      return `![${alt}](/${path})`;
    }
  );
  
  return fixedContent;
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
          f.file_type === 'sqlite' || f.file_type === 'sqlite3' || 
          f.file_type === 'json' || f.file_type === 'xml' || f.file_type === 'pdf'
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
    if (!['csv', 'db', 'sqlite', 'sqlite3', 'json', 'xml', 'pdf', 'docx', 'doc', 'txt'].includes(fileType || '')) {
      setError('Unsupported file type. Please upload CSV, JSON, XML, SQLite database, or document files (PDF, DOCX, DOC, TXT).');
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
          f.file_type === 'sqlite' || f.file_type === 'sqlite3' || 
          f.file_type === 'json' || f.file_type === 'xml'
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



  function getFileIcon(file_type: string): React.ReactNode {
    switch(file_type.toLowerCase()) {
      case 'csv':
        return <FileText className="h-4 w-4 mr-2 text-blue-500" />;
      case 'json':
        return <FileJson className="h-4 w-4 mr-2 text-orange-500" />;
      case 'xml':
        return <FileCode className="h-4 w-4 mr-2 text-green-500" />;
      case 'db':
      case 'sqlite':
      case 'sqlite3':
        return <Database className="h-4 w-4 mr-2 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 mr-2 text-gray-500" />;
    }
  }

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
              <Label htmlFor="file-upload">Upload CSV, JSON, XML, or Database File</Label>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.db,.sqlite,.sqlite3,.json,.xml"
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
                        {getFileIcon(file.file_type)}
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
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {filePreview.columns.map((col, idx) => (
                      <th 
                        key={idx}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {filePreview.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
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
      className={`p-4 border rounded-lg mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}`}
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
  const [diagramEnabled, setDiagramEnabled] = useState(false); // Added state
  
  useEffect(() => {
    onConfigChange({
      generateReport,
      questionCount,
      diagram_enabled: diagramEnabled // New property added to config
    });
  }, [generateReport, questionCount, diagramEnabled, onConfigChange]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Options</CardTitle>
        <CardDescription>Configure how you want to analyze your data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Report Generation Option */}
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
          
          {/* Diagram Generation Option - NEW */}
          <div className="flex items-center space-x-2 mt-2 pt-2 border-t">
            <Checkbox 
              id="enable-diagram" 
              checked={diagramEnabled}
              onCheckedChange={(checked) => setDiagramEnabled(checked === true)}
            />
            <label 
              htmlFor="enable-diagram" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Generate Flow Diagram
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground ml-1 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Creates a Mermaid diagram visualizing the analysis flow</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {diagramEnabled && (
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">
                A visual flow diagram will be generated showing the analysis process.
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
  const [mermaidDiagrams, setMermaidDiagrams] = useState<string[]>([]); // New state for Mermaid diagrams
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
    setMermaidDiagrams([]); // Clear Mermaid diagrams
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
      
      // Set Mermaid diagrams
      if (result.mermaid_diagrams && result.mermaid_diagrams.length > 0) {
        setMermaidDiagrams(result.mermaid_diagrams);
      }
    } else if (result && result.is_report) {
      // For report responses, just use the visualizations from the API
      setExtractedVisualizations(result.visualizations || []);
      
      // Set Mermaid diagrams
      if (result.mermaid_diagrams && result.mermaid_diagrams.length > 0) {
        setMermaidDiagrams(result.mermaid_diagrams);
      }
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
          const fixedContent = fixMarkdownImagePaths(response.data.content);
          setSelectedReportContent(fixedContent);
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
    setMermaidDiagrams([]); // Clear Mermaid diagrams
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
            report_questions: config.questionCount,
            diagram_enabled: config.diagram_enabled // Pass diagram parameter
          }
        );
        
        if (response.data.success) {
          console.log('Visualizations from backend:', response.data.visualizations);
          console.log('Mermaid diagrams from backend:', response.data.mermaid_diagrams);
          // Set result based on response - either report or question
          setResult(prev => ({
            ...response.data,
            // Only keep cleaned_data_file if it's actually in the response
            cleaned_data_file: response.data.cleaned_data_file || undefined
          }));
          
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
          
          // Set Mermaid diagrams
          if (response.data.mermaid_diagrams && response.data.mermaid_diagrams.length > 0) {
            setMermaidDiagrams(response.data.mermaid_diagrams);
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
  
  const MermaidDiagram: React.FC<{ source: string }> = ({ source }) => {
    const [diagram, setDiagram] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const dialogContainerRef = useRef<HTMLDivElement>(null);
    
    // Initialize mermaid only once
    useEffect(() => {
      mermaid.initialize({
        startOnLoad: true,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        logLevel: 'error',
        fontFamily: 'inherit',
      });
    }, []);
    
    // Fetch and render diagram when source changes
    useEffect(() => {
      if (!source) return;
      
      const fetchAndRenderDiagram = async () => {
        setLoading(true);
        try {
          const filename = source.split('/').pop();
          const response = await fetch(`http://localhost:5000/mermaid/${filename}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch diagram: ${response.status}`);
          }
          
          const text = await response.text();
          setDiagram(text);
          
          // Wait for next render cycle before rendering mermaid
          setTimeout(() => {
            if (containerRef.current && text) {
              try {
                // Clear previous content
                containerRef.current.innerHTML = '';
                
                // Create a div for mermaid to render into
                const renderDiv = document.createElement('div');
                renderDiv.className = 'mermaid';
                renderDiv.textContent = text;
                containerRef.current.appendChild(renderDiv);
                
                // Let mermaid process all diagrams
                mermaid.init(undefined, '.mermaid');
                setError(null);
              } catch (renderError) {
                console.error("Error rendering Mermaid diagram:", renderError);
                setError(`Rendering error: ${renderError instanceof Error ? renderError.message : String(renderError)}`);
              }
            }
          }, 0);
        } catch (error) {
          console.error("Error fetching Mermaid diagram:", error);
          setError(error instanceof Error ? error.message : "Failed to load diagram");
        } finally {
          setLoading(false);
        }
      };
      
      fetchAndRenderDiagram();
    }, [source]);
  
    // Re-render mermaid diagram in dialog when it opens
    useEffect(() => {
      if (isDialogOpen && dialogContainerRef.current && diagram) {
        // Clear previous content
        dialogContainerRef.current.innerHTML = '';
        
        // Create a div for mermaid to render into
        const renderDiv = document.createElement('div');
        renderDiv.className = 'mermaid-dialog';
        renderDiv.textContent = diagram;
        dialogContainerRef.current.appendChild(renderDiv);
        
        // Let mermaid process all diagrams
        mermaid.init(undefined, '.mermaid-dialog');
      }
    }, [isDialogOpen, diagram, zoomLevel]);
  
    // Handle zoom in/out
    const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };
  
    const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };
  
    const handleResetZoom = () => {
      setZoomLevel(1);
    };
  
    // Download diagram as SVG
    const handleDownload = () => {
      if (dialogContainerRef.current) {
        // Find the SVG element
        const svgElement = dialogContainerRef.current.querySelector('svg');
        
        if (svgElement) {
          // Create a serialized SVG string
          const svgData = new XMLSerializer().serializeToString(svgElement);
          
          // Create a Blob with the SVG data
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          
          // Create a download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mermaid-diagram-${Date.now()}.svg`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    };
    
    return (
      <div className="border rounded-lg p-4 my-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="font-medium">Analysis Flow Diagram</h3>
          </div>
          {!loading && !error && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDialogOpen(true)}
              className="text-xs"
            >
              <Maximize className="h-3 w-3 mr-1" />
              Expand
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p className="font-medium">Error loading diagram</p>
            <p className="text-sm">{error}</p>
            <pre className="mt-2 text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {diagram}
            </pre>
          </div>
        ) : (
          <div 
            className="overflow-auto bg-white dark:bg-gray-900 p-4 rounded-md cursor-pointer"
            onClick={() => setIsDialogOpen(true)}
          >
            <div ref={containerRef} className="mermaid-container" />
          </div>
        )}
        
        {/* Dialog for expanded view */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl w-full max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-blue-500" />
                Analysis Flow Diagram
              </DialogTitle>
            </DialogHeader>
            
            {/* Zoom controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                  {Math.round(zoomLevel * 100)}%
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download SVG
              </Button>
            </div>
            
            {/* Diagram container with zoom */}
            <div className="relative w-full h-[calc(100vh-200px)] bg-white dark:bg-gray-900 rounded-md overflow-auto">
              <div 
                ref={dialogContainerRef} 
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s ease-out'
                }}
                className="mermaid-dialog-container"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

// Add Data Cleaning Result Component
const DataCleaningResult: React.FC<{ cleanedDataFile: string }> = ({ cleanedDataFile }) => {
  return (
    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-green-700 dark:text-green-300 text-lg">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Data Cleaning Completed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          Your data has been successfully cleaned and is ready for further analysis or machine learning tasks.
        </p>
        <Button 
          variant="outline" 
          className="border-green-500 text-green-600 hover:bg-green-50 mt-2"
          onClick={() => window.open(`http://localhost:5000/cleaned_data.csv`, '_blank')}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Cleaned Data
        </Button>
      </CardContent>
    </Card>
  );
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

  // Check if this is a database file
  const isDatabaseFile = selectedFile?.fileType === 'db' || 
                        selectedFile?.fileType === 'sqlite' || 
                        selectedFile?.fileType === 'sqlite3';
  
  // Prepare suggested questions based on file type
  const suggestedQuestions = isDatabaseFile ? [
    "Tell me about this database",
    "List all tables and their schemas",
    "Show me the top 5 products by price",
    "How many orders does each user have?",
    "What is the average rating for each product?"
  ] : [
    "Show me a summary of this data",
    "Create a bar chart of the top 5 items",
    "What trends do you see in this data?",
    "Calculate the average values by category",
    "Clean this data and suggest ML models" // Added data cleaning suggestion
  ];
  
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
                    placeholder={isDatabaseFile ? 
                      "e.g., Show me the top 5 products by price" : 
                      "e.g., Clean this data and suggest ML models"}
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
              
              {/* Suggested questions */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggested questions:</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((sq, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setQuestion(sq)}
                    >
                      {sq}
                    </Badge>
                  ))}
                </div>
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
          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 border border-dashed rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-medium mb-1">{config.generateReport ? 'Generating Report' : 'Analyzing Your Data'}</h3>
                <p className="text-sm text-muted-foreground">This may take a few moments...</p>
              </div>
            </div>
          )}
        
          {result?.cleaned_data_file && 
          (sortedSections.some(section => 
            section.agentName === "Data Cleaning Expert" || 
            section.agentName === "Data Quality Analyzer" ||
            section.agentName === "Data Cleaning Planner"
          )) && (
            <DataCleaningResult cleanedDataFile={result.cleaned_data_file} />
          )}
          {/* Display the ordered agent sections for question responses */}
          {sortedSections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                  Analysis Process
                </CardTitle>
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
                  
                  {/* SQL Generator */}
                  {sortedSections.filter(section => 
                    section.agentName === "SQL Generator"
                  ).map((section, index) => (
                    <AgentBox key={`sql-gen-${index}`} section={section} />
                  ))}
                  
                  {/* Data Quality Analyzer - New for Data Cleaning */}
                  {sortedSections.filter(section => 
                    section.agentName === "Data Quality Analyzer"
                  ).map((section, index) => (
                    <AgentBox key={`quality-${index}`} section={section} />
                  ))}
                  
                  {/* Data Cleaning Planner - New for Data Cleaning */}
                  {sortedSections.filter(section => 
                    section.agentName === "Data Cleaning Planner"
                  ).map((section, index) => (
                    <AgentBox key={`cleaning-plan-${index}`} section={section} />
                  ))}
                  
                  {/* Code Generator */}
                  {sortedSections.filter(section => 
                    section.agentName === "Code Generator" ||
                    section.agentName === "Planner"
                  ).map((section, index) => (
                    <AgentBox key={`code-gen-${index}`} section={section} />
                  ))}
                  
                  {/* ML Model Suggester - New for Data Cleaning */}
                  {sortedSections.filter(section => 
                    section.agentName === "ML Model Suggester"
                  ).map((section, index) => (
                    <AgentBox key={`ml-suggest-${index}`} section={section} />
                  ))}
                  
                  {/* Summary Results + Plot */}
                  {((analysisSummary && !result?.is_report) || (result && mermaidDiagrams.length > 0)) && (
                    <div className="space-y-4">
                      {analysisSummary && (
                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                              <Sparkles className="h-5 w-5 mr-2" />
                              Analysis Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <EnhancedMarkdown content={analysisSummary.content} />
                          </CardContent>
                        </Card>
                      )}
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
                      {/* Mermaid Diagrams for both CSV and SQL results */}
                      {mermaidDiagrams.length > 0 && (
                        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-indigo-700 dark:text-indigo-300">
                              <BarChart className="h-5 w-5 mr-2" />
                              Analysis Flow Diagram
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {mermaidDiagrams.map((diagram, index) => (
                              <MermaidDiagram key={index} source={diagram} />
                            ))}
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
                    section.agentName !== "SQL Generator" &&
                    section.agentName !== "Code Generator" &&
                    section.agentName !== "Planner" &&
                    section.agentName !== "Analysis Summary" &&
                    section.agentName !== "Data Quality Analyzer" &&
                    section.agentName !== "Data Cleaning Planner" &&
                    section.agentName !== "ML Model Suggester"
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
                  <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
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
                <div className={`${!showFullReport ? "max-h-[600px] overflow-y-auto pr-2" : ""}`}>
                  <EnhancedMarkdown content={reportContent} />
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
                          
                          <div className="max-h-[700px] overflow-y-auto px-2">
                            <EnhancedMarkdown content={selectedReportContent} />
                          </div>
                          
                          {/* Visualizations section */}
                          {selectedReportId && savedReports.find(r => r.id === selectedReportId)?.visualizations && savedReports.find(r => r.id === selectedReportId)!.visualizations.length > 0 && (
                            <div className="space-y-2 border-t pt-4 mt-4">
                              <h4 className="font-medium flex items-center">
                                <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                                Visualizations
                              </h4>
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
export default function InsightAIPage() {
  const { user } = useUser();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [config, setConfig] = useState<AnalysisConfig>({
    generateReport: false,
    questionCount: 3,
    diagram_enabled: false
  });
  
  // Determine if the selected file is a document (PDF, DOCX, etc.)
  const isDocumentFile = selectedFile?.fileType === 'pdf' || 
                         selectedFile?.fileType === 'docx' || 
                         selectedFile?.fileType === 'doc' || 
                         selectedFile?.fileType === 'txt';

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 flex items-center justify-center">
        <Database className="h-8 w-8 mr-3 text-blue-500" />
        InsightAI Data Analysis
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <FileSelector 
          userId={user?.id} 
          onFileSelect={setSelectedFile}
        />
        
        {selectedFile && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg flex items-center">
              <div className="mr-3">
                {selectedFile.fileType === 'csv' ? (
                  <FileText className="h-5 w-5 text-blue-500" />
                ) : selectedFile.fileType === 'json' ? (
                  <FileJson className="h-5 w-5 text-blue-500" />
                ) : selectedFile.fileType === 'xml' ? (
                  <FileCode className="h-5 w-5 text-blue-500" />
                ) :  selectedFile.fileType === 'pdf' ? (
                  <FileText className="h-5 w-5 text-red-500" />
                ) : selectedFile.fileType === 'docx' || selectedFile.fileType === 'doc' ? (
                  <FileText className="h-5 w-5 text-blue-500" />
                ) : (
                  <Database className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div>
                <p className="font-medium">{selectedFile.fileName || 'Unknown file'}</p>
                <p className="text-sm text-muted-foreground">
                  Type: {selectedFile.fileType?.toUpperCase() || 'Unknown'} • 
                  ID: {selectedFile.fileId || 'New file'}
                </p>
              </div>
            </div>
            
            {isDocumentFile ? (
              // Document Analysis Panel for document files (PDF, DOCX, etc.)
              <DocumentAnalysisPanel 
                userId={user?.id}
                selectedFile={selectedFile}
              />
            ) : (
              // Standard data analysis for structured data files
              <>
                <AnalysisConfig onConfigChange={setConfig} />
                <AnalysisPanel 
                  userId={user?.id}
                  selectedFile={selectedFile}
                  config={config}
                />
              </>
            )}

            {/* <AnalysisConfig onConfigChange={setConfig} /> */}
            
            {/* <AnalysisPanel 
              userId={user?.id}
              selectedFile={selectedFile}
              config={config}
            /> */}
          </>
        )}
      </div>
    </div>
  );
}


const DocumentAnalysisPanel: React.FC<{
  userId: string | undefined;
  selectedFile: SelectedFile | null;
}> = ({ userId, selectedFile }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    status: string;
    progress: number;
    message: string;
  }>({ status: '', progress: 0, message: '' });
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<{
    success: boolean;
    query: string;
    final_answer: string;
    images: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [modelName, setModelName] = useState<string>("meta-llama/llama-4-maverick-17b-128e-instruct");
  const [verboseMode, setVerboseMode] = useState<boolean>(false);
  const [verboseOutput, setVerboseOutput] = useState<{
    infoMessages: string[];
    textSummaries: string[];
    tableSummaries: string[];
    imageSummaries: string[];
  }>({
    infoMessages: [],
    textSummaries: [],
    tableSummaries: [],
    imageSummaries: []
  });

  
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (polling && processId) {
      intervalId = setInterval(async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/check-document-processing/${processId}`
          );
          
          setProcessingStatus({
            status: response.data.status,
            progress: response.data.progress * 100,
            message: response.data.message
          });
          
          // Parse verbose output if available
          if (verboseMode && response.data.verbose_output) {
            parseVerboseOutput(response.data.verbose_output);
          }
          
          if (response.data.status === 'completed') {
            setPolling(false);
            setIsProcessing(false);
            setIsProcessed(true);
          } else if (response.data.status === 'failed') {
            setPolling(false);
            setIsProcessing(false);
            setError(response.data.message || 'Processing failed');
          }
        } catch (err) {
          console.error('Error checking document processing status:', err);
          setPolling(false);
        }
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling, processId, verboseMode]);

  const parseVerboseOutput = (output: string) => {
    // Parse INFO messages
    const infoRegex = /\[INFO\](.*?)(?=\[INFO\]|\[TEXT SUMMARIES\]|\[TABLE SUMMARIES\]|\[IMAGE SUMMARIES\]|$)/gs;
    const infoMatches = [...output.matchAll(infoRegex)].map(match => match[1].trim());
    
    // Parse TEXT SUMMARIES
    const textSummariesMatch = output.match(/\[TEXT SUMMARIES\]\s*\n\s*(.*?)(?=\[TABLE SUMMARIES\]|$)/s);
    const textSummaries = textSummariesMatch ? 
      JSON.parse(textSummariesMatch[1].trim().replace(/^\'|\'$/g, '"').replace(/\'/g, '"')) : [];
    
    // Parse TABLE SUMMARIES
    const tableSummariesMatch = output.match(/\[TABLE SUMMARIES\]\s*\n\s*(.*?)(?=\[IMAGE SUMMARIES\]|$)/s);
    const tableSummaries = tableSummariesMatch ? 
      JSON.parse(tableSummariesMatch[1].trim().replace(/^\'|\'$/g, '"').replace(/\'/g, '"')) : [];
    
    // Parse IMAGE SUMMARIES
    const imageSummariesMatch = output.match(/\[IMAGE SUMMARIES\]\s*\n\s*(.*?)(?=\[WARNING\]|$)/s);
    const imageSummaries = imageSummariesMatch ? 
      JSON.parse(imageSummariesMatch[1].trim().replace(/^\'|\'$/g, '"').replace(/\'/g, '"')) : [];
    
    setVerboseOutput({
      infoMessages: infoMatches,
      textSummaries: textSummaries,
      tableSummaries: tableSummaries,
      imageSummaries: imageSummaries
    });
  };
  

  const startProcessing = async () => {
    if (!userId || !selectedFile?.fileId) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `http://localhost:5000/process-document/${userId}/${selectedFile.fileId}`,
        { 
          model_name: modelName,
          verbose: verboseMode
        }
      );
      
      if (response.data.process_id) {
        setProcessId(response.data.process_id);
        setPolling(true);
      } else {
        throw new Error(response.data.error || "Failed to start processing");
      }
    } catch (err: any) {
      console.error('Error starting document processing:', err);
      setError(err.response?.data?.error || err.message || 'An unknown error occurred');
      setIsProcessing(false);
    }
  };


  // Check processing status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (polling && processId) {
      intervalId = setInterval(async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/check-document-processing/${processId}`
          );
          
          setProcessingStatus({
            status: response.data.status,
            progress: response.data.progress * 100,
            message: response.data.message
          });
          
          if (response.data.status === 'completed') {
            setPolling(false);
            setIsProcessing(false);
            setIsProcessed(true);
          } else if (response.data.status === 'failed') {
            setPolling(false);
            setIsProcessing(false);
            setError(response.data.message || 'Processing failed');
          }
        } catch (err) {
          console.error('Error checking document processing status:', err);
          setPolling(false);
        }
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling, processId]);

  // Query the processed document
  const handleQuery = async () => {
    if (!userId || !selectedFile?.fileId || !query) return;
    
    setError(null);
    
    try {
      const response = await axios.post(
        `http://localhost:5000/query-document/${userId}/${selectedFile.fileId}`,
        { query }
      );
      
      if (response.data.success) {
        setQueryResult(response.data);
      } else {
        throw new Error(response.data.error || "Failed to process query");
      }
    } catch (err: any) {
      console.error('Error querying document:', err);
      setError(err.response?.data?.error || err.message || 'An unknown error occurred');
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="h-5 w-5 mr-2 inline-block" />
            Document Analysis
          </CardTitle>
          <CardDescription>
            Process and query your document using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isProcessed && !isProcessing ? (
            <div className="space-y-4">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model-select">AI Model</Label>
                <Select 
                  value={modelName} 
                  onValueChange={setModelName}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">
                      Llama 4 Maverick (Recommended)
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini">
                      GPT-4o Mini (Faster)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Verbose Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="verbose-mode" 
                  checked={verboseMode}
                  onCheckedChange={(checked) => setVerboseMode(checked === true)}
                />
                <label 
                  htmlFor="verbose-mode" 
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Verbose Mode (Detailed Processing Information)
                </label>
              </div>
              
              <Button 
                className="w-full"
                onClick={startProcessing}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Process Document
              </Button>
            </div>
          ) : isProcessing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{processingStatus.message}</span>
                  <span>{Math.round(processingStatus.progress)}%</span>
                </div>
                <Progress value={processingStatus.progress} className="w-full h-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about this document..."
                  className="flex-1"
                />
                <Button onClick={handleQuery} disabled={!query}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {queryResult && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">
                      <Sparkles className="h-5 w-5 mr-2 inline-block text-blue-500" />
                      Answer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Display the FINAL ANSWER tag content */}
                    <div className="prose prose-sm dark:prose-invert">
                      {queryResult.final_answer.includes("[FINAL ANSWER]") ? (
                        // Parse out the final answer part
                        <EnhancedMarkdown 
                          content={queryResult.final_answer.split("[FINAL ANSWER]")[1].trim()} 
                        />
                      ) : (
                        <EnhancedMarkdown content={queryResult.final_answer} />
                      )}
                    </div>
                    
                    {/* Images Section - Display with better formatting */}
                    {queryResult.images && queryResult.images.length > 0 && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <h4 className="font-medium flex items-center">
                          <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                          Document Images
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {queryResult.images.map((img, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                              <div className="relative w-full h-64">
                                <img 
                                  src={`data:image/jpeg;base64,${img.data}`} 
                                  alt={img.summary || `Document image ${idx+1}`}
                                  className="object-contain w-full h-full"
                                />
                              </div>
                              {img.summary && (
                                <div className="text-center text-sm text-muted-foreground py-2 px-2 border-t">
                                  {img.summary}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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

      {/* Add this to the DocumentAnalysisPanel's return statement after the error Alert */}
{verboseMode && isProcessing && verboseOutput && (
  <div className="space-y-4 mt-8">
    <h3 className="text-xl font-semibold flex items-center">
      <Terminal className="h-5 w-5 mr-2 text-blue-500" />
      Verbose Processing Output
    </h3>
    
    {/* INFO Messages */}
    {verboseOutput.infoMessages.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-500" />
            Document Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {verboseOutput.infoMessages.map((info, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <pre className="whitespace-pre-wrap text-sm font-mono">{info}</pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
    
    {/* Text Summaries */}
    {verboseOutput.textSummaries.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <AlignLeft className="h-5 w-5 mr-2 text-green-500" />
            Text Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verboseOutput.textSummaries.map((summary, index) => (
              <div key={index} className="bg-green-50 dark:bg-green-900/10 p-4 rounded-md">
                <p className="whitespace-pre-wrap text-sm">{summary}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
    
    {/* Table Summaries */}
    {verboseOutput.tableSummaries.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Table className="h-5 w-5 mr-2 text-amber-500" />
            Table Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verboseOutput.tableSummaries.map((summary, index) => (
              <div key={index} className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-md">
                <p className="whitespace-pre-wrap text-sm">{summary}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
    
    {/* Image Summaries */}
    {verboseOutput.imageSummaries.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <ImageIcon className="h-5 w-5 mr-2 text-purple-500" />
            Image Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verboseOutput.imageSummaries.map((summary, index) => (
              <div key={index} className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-md border border-purple-100 dark:border-purple-800">
                <p className="whitespace-pre-wrap text-sm">{summary}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
)}
    </div>
  );
};