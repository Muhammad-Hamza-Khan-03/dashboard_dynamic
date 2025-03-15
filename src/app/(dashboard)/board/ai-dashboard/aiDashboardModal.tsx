import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader, BrainCircuit, Bot, User, Sparkles, LayoutDashboard, Zap, Code, Check, Database, Type, Table } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';
import Markdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { getLayoutTemplateById } from '../template/layoutTemplate';
import LayoutSelector from '../template/layoutSelector';
import DashboardPreview from './DashboardPreview';

interface AiDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  columns: Array<{ header: string; accessorKey: string; isNumeric: boolean }>;
  data: Array<Record<string, any>>;
  onCreateDashboard: (config: AiDashboardConfig) => void;
}

export interface ChartConfig {
  type: string;
  columns: string[];
  title: string;
  description?: string;
  position: { x: number; y: number; width?: number; height?: number };
}

export interface TextConfig {
  content: string;
  position: { x: number; y: number; width?: number; height?: number };
}

export interface TableConfig {
  columns: string[];
  title: string;
  position: { x: number; y: number; width?: number; height?: number };
}

export interface CardConfig {
  column: string;
  statType: string;
  title: string;
  position: { x: number; y: number; width?: number; height?: number };
}

export interface AiDashboardConfig {
  charts: ChartConfig[];
  textBoxes: TextConfig[];
  dataTables: TableConfig[];
  statCards: CardConfig[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Parse content to separate "thinking" from regular content
const parseContent = (content: string) => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkRegex);
  if (!match) return { think: null, rest: content.trim() };

  const thinkContent = match[1].trim();
  const restContent = content.replace(thinkRegex, "").trim();
  return { think: thinkContent, rest: restContent };
};

const AiDashboardModal: React.FC<AiDashboardModalProps> = ({
  isOpen,
  onClose,
  position,
  columns,
  data,
  onCreateDashboard
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome',
      role: 'assistant', 
      content: 'I can help you create an AI-generated dashboard based on your data. Describe what you want to visualize, or select one of the suggested dashboard ideas below.'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  
  // Layout template state
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedLayout, setSelectedLayout] = useState('grid-3');
  const [useStructuredLayout, setUseStructuredLayout] = useState(true);
  const [parsedConfig, setParsedConfig] = useState<AiDashboardConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const [thinkingStages, setThinkingStages] = useState<string[]>([]);
  const [thinkingProgress, setThinkingProgress] = useState(0);

  // Generate message ID helper
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Get AI-generated suggestions when modal opens
  useEffect(() => {
    if (isOpen && columns.length > 0 && data.length > 0) {
      generateSuggestions();
    }
  }, [isOpen, columns, data]);
  
  // Update parsedConfig when AI response is processed
  useEffect(() => {
    if (window.aiDashboardConfig && useStructuredLayout) {
      applyLayoutToConfig();
    }
  }, [window.aiDashboardConfig, selectedLayout, useStructuredLayout]);

  // Function to generate dashboard suggestions from AI
  const generateSuggestions = async () => {
    if (isLoadingSuggestions || columns.length === 0 || data.length === 0) return;
    
    setIsLoadingSuggestions(true);
    
    try {
      const sampleData = data.slice(0, 3);
      const suggestionPrompt = `
        Based on the following data schema and sample data, suggest 3 different dashboard ideas that would be valuable.
        Return only 3 short, specific dashboard prompts (one sentence each) that a user could use to create a dashboard.
        Format your response as a JSON array of strings: ["suggestion1", "suggestion2", "suggestion3"]
        
        Columns: ${JSON.stringify(columns)}
        Sample data: ${JSON.stringify(sampleData)}
      `;
      
      const response = await axios.post('/api/ai/dashboard', {
        content: suggestionPrompt
      });
      
      let suggestions;
      try {
        // Try to parse JSON from the response
        const responseText = response.data.content;
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: Extract sentences and format as suggestions
          const sentences = responseText.split(/[.!?]/).filter(Boolean).map((s: string) => s.trim());
          suggestions = sentences.slice(0, 3).map((s:string) => s + (s.endsWith('.') ? '' : '.'));
        }
        
        setAiSuggestions(suggestions);
      } catch (error) {
        console.error("Error parsing suggestions:", error);
        setAiSuggestions([
          "Create a performance overview dashboard with key metrics and trends",
          "Generate a data comparison dashboard with interactive charts",
          "Build a comprehensive analytics dashboard with insights and KPIs"
        ]);
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      // Fallback suggestions
      setAiSuggestions([
        "Create a performance overview dashboard with key metrics and trends",
        "Generate a data comparison dashboard with interactive charts",
        "Build a comprehensive analytics dashboard with insights and KPIs"
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Apply selected layout template to the AI-generated config
  const applyLayoutToConfig = () => {
    if (!window.aiDashboardConfig) return;
    
    // Get the selected layout template
    const layoutTemplate = getLayoutTemplateById(selectedLayout);
    if (!layoutTemplate) return;
    
    // Ensure all required properties exist in the config
    const safeConfig = {
      charts: window.aiDashboardConfig.charts || [],
      textBoxes: window.aiDashboardConfig.textBoxes || [],
      dataTables: window.aiDashboardConfig.dataTables || [],
      statCards: window.aiDashboardConfig.statCards || []
    };
    
    // Calculate element counts
    const elementCounts = {
      charts: safeConfig.charts.length,
      textBoxes: safeConfig.textBoxes.length,
      dataTables: safeConfig.dataTables.length,
      statCards: safeConfig.statCards.length
    };
    
    // Generate layout positions using the template
    const layoutPositions = layoutTemplate.generateLayout(
      elementCounts,
      window.innerWidth * 0.7, // Estimate dashboard width
      window.innerHeight * 0.7  // Estimate dashboard height
    );
    
    // Create a new config with the layout positions
    const newConfig: AiDashboardConfig = {
      charts: safeConfig.charts.map((chart, index) => ({
        ...chart,
        position: layoutPositions.charts[index]?.position || chart.position
      })),
      textBoxes: safeConfig.textBoxes.map((textBox, index) => ({
        ...textBox,
        position: layoutPositions.textBoxes[index]?.position || textBox.position
      })),
      dataTables: safeConfig.dataTables.map((dataTable, index) => ({
        ...dataTable,
        position: layoutPositions.dataTables[index]?.position || dataTable.position
      })),
      statCards: safeConfig.statCards.map((statCard, index) => ({
        ...statCard,
        position: layoutPositions.statCards[index]?.position || statCard.position
      }))
    };
    
    // Update the parsed config for preview
    setParsedConfig(newConfig);
  };
  
  // Simulates AI thinking with realistic stages and progress
  const simulateThinking = () => {
    const stages = [
      "Analyzing data structure and types...",
      "Identifying relationships between columns...",
      "Determining best visualization approaches...",
      "Selecting optimal chart types...",
      "Designing dashboard layout...",
      "Organizing visualizations for insights...",
      "Generating optimized configurations...",
      "Finalizing dashboard structure..."
    ];
    
    setThinkingStages(stages);
    
    // Reset progress
    setThinkingProgress(0);
    
    // Simulate progressive thinking for each stage
    let currentStage = 0;
    const interval = setInterval(() => {
      setThinkingProgress(prev => {
        const newProgress = prev + (1 / (stages.length * 3));
        
        // Move to next stage at certain thresholds
        if (newProgress > (currentStage + 1) / stages.length) {
          currentStage = Math.min(currentStage + 1, stages.length - 1);
        }
        
        return Math.min(newProgress, 0.95); // Cap at 95% to finish with response
      });
      
      // Clear when almost done
      if (currentStage >= stages.length - 1) {
        clearInterval(interval);
      }
    }, 750);
    
    return () => clearInterval(interval);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Start timing the response
    startTimeRef.current = Date.now();
    
    // Add user message to chat
    const userMessageId = generateMessageId();
    const userMessage = { 
      id: userMessageId,
      role: 'user' as const, 
      content: inputMessage 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    
    // Start thinking simulation
    const clearThinking = simulateThinking();

    try {
      // Prepare context for the AI
      const sampleData = data.slice(0, 5);
      
      // Define system prompt
      const systemPrompt = `You are an AI dashboard designer assistant. Based on the user's request and the data schema provided:
<think>
1. Analyze the columns and determine which are:
 - Numerical metrics (values to measure)
 - Categorical dimensions (ways to group)
 - Temporal dimensions (time-based columns)
2. Determine appropriate visualizations based on data types:
 - Time series data → Line charts
 - Categorical comparisons → Bar charts
 - Part-to-whole relationships → Pie charts
 - Correlations → Scatter plots
 - Distributions → Histograms or box plots
3. Consider what key metrics should be highlighted in stat cards
4. Plan a logical dashboard layout with complementary visualizations
</think>
Your final response must include a valid JSON configuration with this structure:
{
 "charts": [
 {
 "type": "line|bar|pie|scatter|histogram|box|heatmap|radar|treemap",
 "columns": ["column1", "column2"],
 "title": "Chart Title",
 "description": "Optional description",
 "position": {"x": 100, "y": 100, "width": 800, "height": 600}
 }
 ],
 "textBoxes": [
 {
 "content": "Text content explaining insights",
 "position": {"x": 100, "y": 100, "width": 400, "height": 200}
 }
 ],
 "dataTables": [
 {
 "columns": ["column1", "column2", "column3"],
 "title": "Data Table Title",
 "position": {"x": 100, "y": 100, "width": 600, "height": 400}
 }
 ],
 "statCards": [
 {
 "column": "columnName",
 "statType": "count|sum|mean|mode|max|min",
 "title": "Stat Card Title",
 "position": {"x": 100, "y": 100, "width": 300, "height": 180}
 }
 ]
}
Place this JSON at the end of your response, clearly marked with triple backticks (\`\`\`json and \`\`\`).`;

      // Combine the system prompt, user request, and data context
      const aiPrompt = `${systemPrompt}\n\nUser request: ${inputMessage}\n\nColumns: ${JSON.stringify(columns)}\n\nSample data: ${JSON.stringify(sampleData)}`;
      
      // Call the AI API endpoint
      const response = await axios.post('/api/ai/dashboard', {
        content: aiPrompt
      });

      // Record the response time
      const endTime = Date.now();
      const duration = (endTime - startTimeRef.current) / 1000;

      // Extract the AI response
      const aiMessage = response.data.content;
      const aiMessageId = generateMessageId();
      
      // Complete the thinking progress
      setThinkingProgress(1);
      
      // Add AI response to chat
      setMessages(prev => [
        ...prev, 
        { 
          id: aiMessageId,
          role: 'assistant', 
          content: aiMessage
        }
      ]);
      
      // Record response time
      setResponseTimes(prev => ({
        ...prev,
        [aiMessageId]: duration
      }));

      // Try to extract and parse the JSON configuration
      try {
        // Look for JSON in triple backticks
        const jsonMatch = aiMessage.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        
        let parsedResponse;
        if (jsonMatch && jsonMatch[1]) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } 
        // Try to find any JSON-like structure in the message
        else {
          const possibleJson = aiMessage.match(/{[\s\S]*?}/);
          if (possibleJson) {
            parsedResponse = JSON.parse(possibleJson[0]);
          }
        }

        if (parsedResponse) {
          // Ensure the configuration has all required properties with defaults
          const completeConfig = {
            charts: parsedResponse.charts || [],
            textBoxes: parsedResponse.textBoxes || [],
            dataTables: parsedResponse.dataTables || [],
            statCards: parsedResponse.statCards || []
          };
          
          // Store the sanitized configuration
          window.aiDashboardConfig = completeConfig;
          console.log("Successfully parsed dashboard configuration:", completeConfig);
          
          // Switch to layout tab after getting response
          setTimeout(() => {
            setActiveTab('layout');
          }, 500);
          
          // Apply layout to config
          if (useStructuredLayout) {
            applyLayoutToConfig();
          } else {
            setParsedConfig(completeConfig);
          }
        } else {
          console.error("No valid JSON configuration found in AI response");
        }
      } catch (e) {
        console.error("Failed to parse JSON from AI response:", e);
      }
    } catch (error) {
      console.error("Error generating dashboard:", error);
      setMessages(prev => [
        ...prev, 
        { 
          id: generateMessageId(),
          role: 'assistant', 
          content: 'Sorry, I encountered an error while creating your dashboard. Please try again with a different description.'
        }
      ]);
    } finally {
      setIsProcessing(false);
      clearThinking();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    // Automatically send the suggestion after a short delay
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleCreateDashboard = () => {
    setIsCreating(true);
    
    setTimeout(() => {
      if (parsedConfig) {
        // Ensure all required properties exist before passing to parent
        const safeConfig: AiDashboardConfig = {
          charts: parsedConfig.charts || [],
          textBoxes: parsedConfig.textBoxes || [],
          dataTables: parsedConfig.dataTables || [],
          statCards: parsedConfig.statCards || []
        };
        onCreateDashboard(safeConfig);
        onClose();
      } else if (window.aiDashboardConfig) {
        // Ensure all required properties exist before passing to parent
        const safeConfig: AiDashboardConfig = {
          charts: window.aiDashboardConfig.charts || [],
          textBoxes: window.aiDashboardConfig.textBoxes || [],
          dataTables: window.aiDashboardConfig.dataTables || [],
          statCards: window.aiDashboardConfig.statCards || []
        };
        onCreateDashboard(safeConfig);
        onClose();
      } else {
        setMessages(prev => [
          ...prev, 
          { 
            id: generateMessageId(),
            role: 'assistant', 
            content: 'I need to generate a valid dashboard configuration first. Please try describing what you\'d like to see in your dashboard.'
          }
        ]);
        setActiveTab('chat');
        setIsCreating(false);
      }
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-0 bg-white dark:bg-slate-900 shadow-2xl border-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-200">
            <BrainCircuit className="h-6 w-6 text-indigo-500" />
            AI Dashboard Designer
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-1 py-2 border-b bg-slate-50 dark:bg-slate-800/50">
            <div className="container mx-auto flex items-center justify-between">
              <TabsList className="w-64 h-10 bg-slate-200/70 dark:bg-slate-700/50 p-1 rounded-md">
                <TabsTrigger 
                  value="chat" 
                  className="rounded-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 flex-1"
                >
                  Design
                </TabsTrigger>
                <TabsTrigger 
                  value="layout" 
                  className="rounded-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 flex-1" 
                  disabled={!window.aiDashboardConfig}
                >
                  Layout
                </TabsTrigger>
              </TabsList>
              
              {window.aiDashboardConfig && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1 py-1 px-2">
                  <Check className="h-3.5 w-3.5" />
                  <span>Dashboard Design Ready</span>
                </Badge>
              )}
            </div>
          </div>
            
          <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col md:flex-row p-0 h-full">
            {/* Left side: Chat area with fixed height and scroll */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-r dark:border-slate-700">
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {messages.map((message) => {
                    const { think, rest } = parseContent(message.content);
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex flex-col",
                          message.role === 'user' ? "items-end" : "items-start"
                        )}
                      >
                        <div className="flex items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                          {message.role === 'user' ? (
                            <div className="flex items-center gap-1.5">
                              <div className="bg-blue-100 dark:bg-blue-900 w-5 h-5 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-700 dark:text-blue-300" />
                              </div>
                              <span>You</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="bg-indigo-100 dark:bg-indigo-900 w-5 h-5 rounded-full flex items-center justify-center">
                                <BrainCircuit className="h-3 w-3 text-indigo-700 dark:text-indigo-300" />
                              </div>
                              <span>AI Assistant</span>
                            </div>
                          )}
                        </div>
                        
                        <div
                          className={cn(
                            "max-w-[90%] rounded-lg p-4 shadow-sm",
                            message.role === 'user'
                              ? "bg-blue-500 text-white"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          )}
                        >
                          <div className="prose dark:prose-invert max-w-none">
                            {think && (
                              <div className="mb-4 rounded-md border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 p-3">
                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 mb-2 text-sm font-medium">
                                  <Sparkles className="h-4 w-4" />
                                  <p>Design Thinking Process</p>
                                </div>
                                <Markdown className="text-sm">{think}</Markdown>
                              </div>
                            )}
                            
                            <Markdown>{rest}</Markdown>
                            
                            {responseTimes[message.id] && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                                Generated in {responseTimes[message.id].toFixed(1)}s
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {isProcessing && (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <div className="bg-indigo-100 dark:bg-indigo-900 w-5 h-5 rounded-full flex items-center justify-center">
                            <BrainCircuit className="h-3 w-3 text-indigo-700 dark:text-indigo-300" />
                          </div>
                          <span>AI Assistant</span>
                        </div>
                      </div>
                      
                      <div className="max-w-[90%] rounded-lg p-4 shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="animate-pulse">
                              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                              Designing your dashboard...
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="h-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-in-out"
                                style={{ width: `${thinkingProgress * 100}%` }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              {thinkingStages.map((stage, index) => (
                                <div 
                                  key={index} 
                                  className={cn(
                                    "text-xs px-2 py-1 rounded flex items-center gap-1.5",
                                    thinkingProgress * thinkingStages.length > index
                                      ? "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
                                      : "text-slate-400 dark:text-slate-500"
                                  )}
                                >
                                  {thinkingProgress * thinkingStages.length > index && (
                                    <Check className="h-3 w-3" />
                                  )}
                                  <span>{stage}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-4 border-t dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    ref={inputRef}
                    placeholder="Describe the dashboard you want to create..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right side: AI suggestions */}
            <div className="w-80 md:block hidden">
              <ScrollArea className="h-full">
                <div className="p-4 flex flex-col bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Dashboard Ideas
                  </h3>
                  
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader className="h-5 w-5 animate-spin text-indigo-500" />
                      <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Generating ideas...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          className="w-full px-3 py-2.5 text-left text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4">
                    <h4 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200">Pro Tips</h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2">
                        <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>Specify key metrics and insights you want to highlight</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>Mention your audience (executives, analysts, operations)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Code className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>Include specific chart types if you have preferences</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
            
          <TabsContent value="layout" className="flex-1 overflow-hidden h-full bg-white dark:bg-slate-900">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Layout controls */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                        Dashboard Layout
                      </h3>
                      
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox 
                          id="use-structured-layout" 
                          checked={useStructuredLayout}
                          onCheckedChange={(checked) => {
                            setUseStructuredLayout(!!checked);
                            if (checked && window.aiDashboardConfig) {
                              applyLayoutToConfig();
                            } else if (!checked && window.aiDashboardConfig) {
                              setParsedConfig(window.aiDashboardConfig);
                            }
                          }}
                          className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <Label htmlFor="use-structured-layout" className="text-sm">
                          Use structured layout templates
                        </Label>
                      </div>
                      
                      {useStructuredLayout && (
                        <LayoutSelector
                          selectedLayout={selectedLayout}
                          onSelectLayout={(layoutId) => {
                            setSelectedLayout(layoutId);
                            applyLayoutToConfig();
                          }}
                        />
                      )}
                    </div>
                    
                    {parsedConfig && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          Dashboard Summary
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-md p-2">
                              <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Charts</div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{parsedConfig.charts.length}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-md p-2">
                              <Table className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Tables</div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{parsedConfig.dataTables.length}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 rounded-md p-2">
                              <Type className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Text Boxes</div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{parsedConfig.textBoxes.length}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-md p-2">
                              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Stats</div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{parsedConfig.statCards.length}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Dashboard preview */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-5 h-[600px] overflow-hidden flex flex-col">
                    <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Dashboard Preview
                    </h3>
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-md p-2 overflow-hidden relative border border-slate-200 dark:border-slate-700">
                      {!parsedConfig ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Select a layout to preview your dashboard
                          </p>
                        </div>
                      ) : (
                        <DashboardPreview config={parsedConfig} scale={0.3} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {/* Fixed footer with Create Dashboard button */}
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-800/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    size="lg"
                    className={cn(
                      "bg-indigo-600 hover:bg-indigo-700 text-white transition-all",
                      isCreating && "opacity-90"
                    )}
                    onClick={handleCreateDashboard}
                    disabled={isProcessing || (!window.aiDashboardConfig && !parsedConfig) || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader className="h-5 w-5 mr-2 animate-spin" />
                        Creating Dashboard...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Create Dashboard
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!window.aiDashboardConfig && !parsedConfig && (
                <TooltipContent>
                  <p>Chat with the AI first to design your dashboard</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiDashboardModal;