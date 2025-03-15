import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader, BrainCircuit, Bot, User, Sparkles } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';
import Markdown from 'react-markdown';
import Image from 'next/image';

// You can replace these with your own images or use the Lucide icons
import userAvatar from '@/assets/user-avatar.png'; // Replace with your own image path
import aiAvatar from '@/assets/ai-avatar.png'; // Replace with your own image path

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
    const [messages, setMessages] = useState<ChatMessage[]>([
      { 
        id: 'welcome',
        role: 'assistant', 
        content: 'I can help you create an AI-generated dashboard based on your data. I\'ll analyze your data and suggest some dashboard ideas.'
      }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
    
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number>(0);
  
    // Generate message ID helper
    const generateMessageId = () => {
      return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };
  
    // Parse content to separate "thinking" from regular content
    const parseContent = (content: string) => {
      const thinkRegex = /<think>([\s\S]*?)<\/think>/;
      const match = content.match(thinkRegex);
      if (!match) return { think: null, rest: content.trim() };
  
      const thinkContent = match[1].trim();
      const restContent = content.replace(thinkRegex, "").trim();
      return { think: thinkContent, rest: restContent };
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
            "Create a performance overview dashboard",
            "Generate a data trends analysis dashboard",
            "Build a metrics comparison dashboard"
          ]);
        }
      } catch (error) {
        console.error("Error getting suggestions:", error);
        // Fallback suggestions
        setAiSuggestions([
          "Create a performance overview dashboard",
          "Generate a data trends analysis dashboard",
          "Build a metrics comparison dashboard"
        ]);
      } finally {
        setIsLoadingSuggestions(false);
      }
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
        
        // Call the Groq API endpoint
        const response = await axios.post('/api/ai/dashboard', {
          content: aiPrompt
        });
  
        // Record the response time
        const endTime = Date.now();
        const duration = (endTime - startTimeRef.current) / 1000;
  
        // Extract the AI response
        const aiMessage = response.data.content;
        const aiMessageId = generateMessageId();
        
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
            // Store the configuration for later use
            window.aiDashboardConfig = parsedResponse;
            console.log("Successfully parsed dashboard configuration:", parsedResponse);
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
      }
    };
  
    const handleSuggestionClick = (suggestion: string) => {
      setInputMessage(suggestion);
      // Optional: automatically send the suggestion
      // setTimeout(() => handleSendMessage(), 100);
    };
  
    const handleCreateDashboard = () => {
      if (window.aiDashboardConfig) {
        onCreateDashboard(window.aiDashboardConfig);
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
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BrainCircuit className="h-6 w-6 text-purple-500" />
              AI Dashboard Generator
            </DialogTitle>
          </DialogHeader>
  
          {/* Main content with fixed height to prevent button from being pushed out of view */}
          <div className="flex-1 overflow-hidden flex p-4 gap-4">
            {/* Left side: Chat area with fixed height and scroll */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <ScrollArea className="flex-1 p-4 border rounded-lg mb-4 bg-gray-50 dark:bg-gray-800">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const { think, rest } = parseContent(message.content);
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {message.role === 'user' ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">You</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">AI Assistant</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="prose dark:prose-invert max-w-none">
                            {think && (
                              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 rounded-md p-3 mb-3 text-sm">
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                  <Sparkles className="h-4 w-4 animate-pulse" />
                                  <p className="font-semibold">Thinking Process</p>
                                </div>
                                <Markdown>{think}</Markdown>
                              </div>
                            )}
                            
                            <Markdown>{rest}</Markdown>
                            
                            {responseTimes[message.id] && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                                Generated in {responseTimes[message.id].toFixed(2)}s
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm max-w-[85%]">
                        <div className="flex items-center gap-2 mb-2">
                          <BrainCircuit className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">AI Assistant</span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-600">
                          <Sparkles className="h-5 w-5 animate-pulse" />
                          <div className="animate-pulse">Designing your dashboard...</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
  
              {/* Input area */}
              <div className="flex gap-2">
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
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
  
            {/* Right side: AI suggestions (now dynamically generated) */}
            <div className="w-80 flex flex-col overflow-hidden">
              <Card className="mb-4 flex-1 overflow-hidden">
                <CardContent className="p-4 h-full flex flex-col">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    AI Suggested Dashboards
                  </h3>
                  
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader className="h-5 w-5 animate-spin text-purple-500" />
                      <span className="ml-2 text-sm">Generating suggestions...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-auto py-2 px-3 text-left leading-normal"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold mb-2">Tips for Best Results</h4>
                    <ul className="text-sm space-y-1.5 text-gray-600 dark:text-gray-400 list-disc pl-5">
                      <li>Specify the metrics you want to track</li>
                      <li>Mention what insights you're looking for</li>
                      <li>Include the audience (executives, operations, etc.)</li>
                      <li>Indicate your preferred chart types, if any</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Fixed footer with Create Dashboard button */}
          <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleCreateDashboard}
              disabled={isProcessing || !window.aiDashboardConfig}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Create Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default AiDashboardModal;