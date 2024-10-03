"use client";
// Import statements
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  Edit,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  BookmarkCheckIcon,
  Palette,
  Layout,
} from 'lucide-react';
import axios from 'axios';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Snackbar, Alert, Box } from '@mui/material'; // Importing Box from MUI

// Dynamically import Plotly for client-side rendering
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Define interfaces
interface MessageVersion {
  content: string;
  timestamp: Date;
}

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  type?: 'text' | 'mermaid' | 'table' | 'plot' | 'data_cleaning';
  plotData?: any;
  mermaidCode?: string;
  attachment?: any;
  versions: MessageVersion[];
  currentVersionIndex: number;
}

interface FilePreview {
  columns: string[];
  rows: string[][];
}

// Mermaid Diagram Component
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('mermaid')
      .then(({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: true });
        if (mermaidRef.current) {
          try {
            mermaid.contentLoaded();
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = 'Error rendering diagram.';
            }
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load mermaid:', error);
      });
  }, [chart]);

  return (
    <div className="mermaid w-full overflow-x-auto" ref={mermaidRef}>
      {chart}
    </div>
  );
};

// Table Cell with Tooltip Component
const TableCellWithTooltip: React.FC<{ content: string }> = ({ content }) => {
  const maxLength = 20;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableCell className="truncate max-w-xs cursor-pointer">
            {content.length > maxLength
              ? `${content.substring(0, maxLength)}...`
              : content}
          </TableCell>
        </TooltipTrigger>
        {content.length > maxLength && (
          <TooltipContent className="p-2">
            <span>{content}</span>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

// ChatSection Component
export default function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [agentType, setAgentType] = useState('data_visualization');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // New State Variables for Plotly Integration
  const [selectedColor, setSelectedColor] = useState('#0000ff'); // Marker color
  const [selectedBackground, setSelectedBackground] = useState('#ffffff'); // Background color
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle File Upload
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);

      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        setIsLoading(true);
        const response = await axios.post('http://localhost:7000/upload', formData);

        if (response.data.message) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString(),
              sender: 'system',
              versions: [
                {
                  content: `File uploaded: ${selectedFile.name}`,
                  timestamp: new Date(),
                },
              ],
              currentVersionIndex: 0,
            },
          ]);
          setSuggestions(response.data.suggested_prompts || []);
          // Handle data preview if provided
          if (response.data.preview) {
            setFilePreview(response.data.preview);
          }
        }
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error uploading file:', errorMessage);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: (Date.now() + 1).toString(),
            sender: 'system',
            versions: [
              {
                content: 'Error uploading file. Please try again.',
                timestamp: new Date(),
              },
            ],
            currentVersionIndex: 0,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Suggestion Click
  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  // Handle Sending Message
  const handleSendMessage = async () => {
    if ((inputMessage.trim() === '' && !file) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      versions: [
        {
          content: inputMessage,
          timestamp: new Date(),
        },
      ],
      currentVersionIndex: 0,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:7000/query', {
        question: userMessage.versions[userMessage.currentVersionIndex].content,
        agent_type: agentType,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Construct AI Message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        versions: [
          {
            content: response.data.output || 'I have processed your request.',
            timestamp: new Date(),
          },
        ],
        currentVersionIndex: 0,
        type: 'text',
      };

      // Handle Graph Data
      if (response.data.graph) {
        aiMessage.type = 'plot';
        // Parse the graph data
        if (typeof response.data.graph === 'string') {
          aiMessage.plotData = JSON.parse(response.data.graph);
        } else {
          aiMessage.plotData = response.data.graph;
        }
      }

      // Handle Mermaid Diagram
      if (response.data.mermaid) {
        aiMessage.type = 'mermaid';
        aiMessage.mermaidCode = response.data.mermaid;
      }

      // Handle Data Cleaning Attachment
      if (agentType === 'data_cleaning' && response.data.attachment) {
        aiMessage.type = 'data_cleaning';
        aiMessage.attachment = response.data.attachment;
      }

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setSuggestions(response.data.suggestions || []);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error sending message:', errorMessage);
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        versions: [
          {
            content: `An error occurred while processing your request: ${errorMessage}. Please try again or contact support if the issue persists.`,
            timestamp: new Date(),
          },
        ],
        currentVersionIndex: 0,
      };
      setMessages((prevMessages) => [...prevMessages, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Editing a Message
  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    const messageToEdit = messages.find((msg) => msg.id === messageId);
    if (messageToEdit) {
      const currentVersion = messageToEdit.versions[messageToEdit.currentVersionIndex];
      setEditContent(currentVersion.content);
    }
  };

  // Handle Saving an Edited Message
  const handleSaveEdit = async (messageId: string) => {
    // Update the message with the new content
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id === messageId) {
          const newVersion: MessageVersion = {
            content: editContent,
            timestamp: new Date(),
          };
          return {
            ...msg,
            versions: [...msg.versions.slice(0, msg.currentVersionIndex + 1), newVersion],
            currentVersionIndex: msg.currentVersionIndex + 1,
          };
        }
        return msg;
      })
    );
    setEditingMessageId(null);

    // Optionally, send the updated message to the backend to get a new AI response
    const editedMessage = messages.find((msg) => msg.id === messageId);
    if (editedMessage) {
      const latestContent = editContent;
      setIsLoading(true);
      try {
        const response = await axios.post('http://localhost:7000/query', {
          question: latestContent,
          agent_type: agentType,
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          versions: [
            {
              content: response.data.output || 'I have processed your request.',
              timestamp: new Date(),
            },
          ],
          currentVersionIndex: 0,
          type: 'text',
        };

        // Handle Graph Data
        if (response.data.graph) {
          aiMessage.type = 'plot';
          if (typeof response.data.graph === 'string') {
            aiMessage.plotData = JSON.parse(response.data.graph);
          } else {
            aiMessage.plotData = response.data.graph;
          }
        }

        // Handle Mermaid Diagram
        if (response.data.mermaid) {
          aiMessage.type = 'mermaid';
          aiMessage.mermaidCode = response.data.mermaid;
        }

        // Handle Data Cleaning Attachment
        if (agentType === 'data_cleaning' && response.data.attachment) {
          aiMessage.type = 'data_cleaning';
          aiMessage.attachment = response.data.attachment;
        }

        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error sending edited message:', errorMessage);
        const errorAiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          versions: [
            {
              content: `An error occurred while processing your edited message: ${errorMessage}. Please try again or contact support if the issue persists.`,
              timestamp: new Date(),
            },
          ],
          currentVersionIndex: 0,
        };
        setMessages((prevMessages) => [...prevMessages, errorAiMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Cancelling an Edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // Handle Navigating Between Message Versions
  const handleVersionNavigation = (messageId: string, direction: 'prev' | 'next') => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id === messageId) {
          const newIndex =
            direction === 'prev'
              ? Math.max(0, msg.currentVersionIndex - 1)
              : Math.min(msg.versions.length - 1, msg.currentVersionIndex + 1);
          return {
            ...msg,
            currentVersionIndex: newIndex,
          };
        }
        return msg;
      })
    );
  };

  // Handle Export Graph as JSON
  const exportGraphAsJSON = async (graph: any) => {
    try {
      const response = await axios.post('http://localhost:7000/export_graph', {
        graph: JSON.stringify(graph),
      });

      if (response.status !== 200) {
        throw new Error('Failed to export graph');
      }

      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph.json';
      a.click();
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Graph exported successfully!', severity: 'success' });
    } catch (error: any) {
      console.error('Error exporting graph:', error);
      setSnackbar({ open: true, message: `Error exporting graph: ${error.message}`, severity: 'error' });
    }
  };

  // Render Content Based on Message Type
  const renderContent = (message: Message) => {
    const currentVersion = message.versions[message.currentVersionIndex];

    if (editingMessageId === message.id) {
      // In-Place Editing UI
      return (
        <div>
          <textarea
            className="w-full p-2 border rounded"
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <div className="flex justify-end mt-2 space-x-2">
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSaveEdit(message.id)}>
              <Check className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      );
    }

    if (message.type === 'mermaid' && message.mermaidCode) {
      return <MermaidDiagram chart={message.mermaidCode} />;
    }

    if (message.type === 'plot' && message.plotData) {
      let plotData = message.plotData;

      // Parse graph data if it's a string
      if (typeof plotData === 'string') {
        try {
          plotData = JSON.parse(plotData);
        } catch (e) {
          console.error('Failed to parse plotData:', e);
          return <div>Error parsing plot data.</div>;
        }
      }

      return (
        <Box sx={{ width: '100%', my: 2 }}>
          <Plot
            key={message.id} // Ensure unique key for re-rendering
            data={plotData.data.map((trace: any) => ({
              ...trace,
              marker: {
                ...trace.marker,
                color: selectedColor, // Dynamically set the marker color
              },
            }))}
            layout={{
              ...plotData.layout,
              width: '100%', // Full width of the container
              height: 400, // Fixed height for the graph
              plot_bgcolor: selectedBackground, // Background color of the plot area
              paper_bgcolor: selectedBackground, // Background color of the paper (outer area)
              font: {
                color:
                  selectedBackground === '#000000'
                    ? '#ffffff' // White text for dark backgrounds
                    : selectedBackground === '#ffffff'
                    ? selectedColor // Use selectedColor for light backgrounds
                    : '#000000', // Default to black text
              },
            }}
            config={{ responsive: true }} // Make the graph responsive to container size
          />
          <TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        style={{ marginTop: '4px' }} // Use inline style instead of `sx`
        onClick={() => exportGraphAsJSON(plotData)}
      >
        <BookmarkCheckIcon size={16} />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Export Graph as JSON</TooltipContent>
  </Tooltip>
</TooltipProvider>
        </Box>
      );
    }

    if (message.type === 'data_cleaning' && message.attachment) {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Data Cleaning Results:</h3>
          <ReactMarkdown
            className="prose"
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {message.attachment.cleaning_output}
          </ReactMarkdown>
          <h3 className="text-lg font-bold mt-4">Preview of Cleaned Data:</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {message.attachment.preview_data.length > 0 &&
                    Object.keys(message.attachment.preview_data[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {message.attachment.preview_data.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((value: any, cellIdx: number) => (
                      <TableCellWithTooltip key={cellIdx} content={String(value)} />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              window.open('http://localhost:7000/download_cleaned_data', '_blank');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Cleaned Data
          </Button>
        </div>
      );
    }

    // Default: Render Markdown Content
    return (
      <ReactMarkdown
        className="prose"
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {currentVersion.content}
      </ReactMarkdown>
    );
  };

  // Define Markdown Components for Custom Rendering
  const MarkdownComponents = {
    code({
      inline,
      className,
      children,
      ...props
    }: {
      inline?: boolean;
      className?: string;
      children: React.ReactNode;
    }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="max-h-[200px] overflow-auto rounded-lg border border-gray-200">
          <SyntaxHighlighter
            style={tomorrow}
            language={match[1]}
            PreTag="div"
            customStyle={{
              background: '#f5f5f5',
              padding: '10px',
              fontSize: '14px',
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-gray-200 rounded px-1 py-0.5" {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }: { children: React.ReactNode }) => (
      <table className="table-auto">{children}</table>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead>{children}</thead>
    ),
    tbody: ({ children }: { children: React.ReactNode }) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }: { children: React.ReactNode }) => (
      <tr>{children}</tr>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="px-4 py-2 border">{children}</th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="px-4 py-2 border">{children}</td>
    ),
  };

  // Render All Messages
  const renderMessages = () => {
    return (
      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const currentVersion = message.versions[message.currentVersionIndex];
          const totalVersions = message.versions.length;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              } mb-4`}
            >
              <div
                className={`flex items-start gap-2 max-w-full sm:max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <Avatar className="w-8 h-8 hidden sm:block">
                  <AvatarFallback>
                    {message.sender === 'ai' ? 'AI' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted shadow-sm'
                  }`}
                >
                  {renderContent(message)}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs opacity-50">
                      {format(currentVersion.timestamp, 'HH:mm')}
                    </span>
                    {message.sender === 'user' && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMessage(message.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {totalVersions > 1 && (
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={message.currentVersionIndex <= 0}
                              onClick={() =>
                                handleVersionNavigation(message.id, 'prev')
                              }
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs">
                              {message.currentVersionIndex + 1}/{totalVersions}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={
                                message.currentVersionIndex >= totalVersions - 1
                              }
                              onClick={() =>
                                handleVersionNavigation(message.id, 'next')
                              }
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  // Render Color Selection Controls
  const renderColorControls = () => {
    return (
      <div className="flex space-x-2 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const color = prompt('Enter marker color (hex code):', selectedColor);
                  if (color && /^#([0-9A-F]{3}){1,2}$/i.test(color)) {
                    setSelectedColor(color);
                  } else if (color) {
                    setSnackbar({ open: true, message: 'Invalid color code!', severity: 'error' });
                  }
                }}
              >
                <Palette className="h-4 w-4" />
                <span className="sr-only">Select Marker Color</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select Marker Color</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const color = prompt('Enter background color (hex code):', selectedBackground);
                  if (color && /^#([0-9A-F]{3}){1,2}$/i.test(color)) {
                    setSelectedBackground(color);
                  } else if (color) {
                    setSnackbar({ open: true, message: 'Invalid color code!', severity: 'error' });
                  }
                }}
              >
                <Layout className="h-4 w-4" />
                <span className="sr-only">Select Background Color</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select Background Color</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold text-center mb-2">
          Chat with Your Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Data Preview Table at the Top */}
        {filePreview && (
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-2">Data Preview:</h3>
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {filePreview.columns.map((col, idx) => (
                      <TableHead key={idx}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filePreview.rows.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {row.map((cell, cellIdx) => (
                        <TableCellWithTooltip key={cellIdx} content={cell} />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Color Selection Controls */}
        {renderColorControls()}

        {/* Scrollable Message Area */}
        <div
          className="h-[300px] sm:h-[400px] lg:h-[500px] pr-4 overflow-y-auto"
          ref={scrollAreaRef}
        >
          {renderMessages()}
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <span className="loading loading-dots loading-md"></span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </motion.div>
        )}
        {/* Message Input and Controls */}
        <div className="flex flex-col sm:flex-row w-full items-center space-y-2 sm:space-y-0 sm:space-x-2">
          {/* Agent Type Selector and File Upload */}
          <div className="flex w-full sm:w-auto space-x-2">
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_visualization">Data Visualization</SelectItem>
                <SelectItem value="research_assistant">Research Assistant</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="data_cleaning">Data Cleaning</SelectItem>
                <SelectItem value="business_analytics">Business Analytics</SelectItem>
                <SelectItem value="mermaid_diagram">Mermaid Diagram</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {/* Message Input Field and Send Button */}
          <div className="flex w-full space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={editingMessageId ? editContent : inputMessage}
              onChange={(e) =>
                editingMessageId
                  ? setEditContent(e.target.value)
                  : setInputMessage(e.target.value)
              }
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={isLoading}
            >
              {editingMessageId ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">
                {editingMessageId ? 'Update message' : 'Send message'}
              </span>
            </Button>
          </div>
        </div>
      </CardFooter>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
