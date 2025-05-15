"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader, BrainCircuit, User, Sparkles, Check } from "lucide-react"
import axios from "axios"
import Markdown from "react-markdown"
import { cn } from "@/lib/utils"

// Import the enhanced layout algorithm
import { smartDistributeElements, applyTemplateLayout, createDashboardLayout } from "./layout-algorithm"

interface AiDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  columns: Array<{ header: string; accessorKey: string; isNumeric: boolean }>
  data: Array<Record<string, any>>
  onCreateDashboard: (config: AiDashboardConfig) => void
}

export interface ChartConfig {
  type: string
  columns: string[]
  title: string
  description?: string
  position: { x: number; y: number; width?: number; height?: number }
}

export interface TextConfig {
  content: string
  position: { x: number; y: number; width?: number; height?: number }
}

export interface TableConfig {
  columns: string[]
  title: string
  position: { x: number; y: number; width?: number; height?: number }
}

export interface CardConfig {
  column: string
  statType: string
  title: string
  position: { x: number; y: number; width?: number; height?: number }
}

export interface AiDashboardConfig {
  charts: ChartConfig[]
  textBoxes: TextConfig[]
  dataTables: TableConfig[]
  statCards: CardConfig[]
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

// Parse content to separate "thinking" from regular content
const parseContent = (content: string) => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/
  const match = content.match(thinkRegex)
  if (!match) return { think: null, rest: content.trim() }

  const thinkContent = match[1].trim()
  const restContent = content.replace(thinkRegex, "").trim()
  return { think: thinkContent, rest: restContent }
}

const AiDashboardModal: React.FC<AiDashboardModalProps> = ({
  isOpen,
  onClose,
  position,
  columns,
  data,
  onCreateDashboard,
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can help you create an AI-generated dashboard based on your data. Describe what you want to visualize, or select one of the suggested dashboard ideas below.",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({})

  // Layout template state
  const [selectedLayout, setSelectedLayout] = useState("grid-3")
  const [layoutTemplate, setLayoutTemplate] = useState("executive")
  const [useStructuredLayout, setUseStructuredLayout] = useState(true)
  const [parsedConfig, setParsedConfig] = useState<AiDashboardConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)
  const [thinkingStages, setThinkingStages] = useState<string[]>([])
  const [thinkingProgress, setThinkingProgress] = useState(0)

  // Generate message ID helper
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Get AI-generated suggestions when modal opens
  useEffect(() => {
    if (isOpen && columns.length > 0 && data.length > 0) {
      generateSuggestions()
    }
  }, [isOpen, columns, data])

  // Update parsedConfig when AI response is processed
  useEffect(() => {
    if (window.aiDashboardConfig && useStructuredLayout) {
      applyLayoutToConfig()
    }
  }, [window.aiDashboardConfig, selectedLayout, useStructuredLayout, layoutTemplate])

  // Check if dark mode is enabled
  useEffect(() => {
    // Check for system preference or localStorage value
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const storedPreference = localStorage.getItem("theme")

    if (storedPreference === "dark" || (storedPreference !== "light" && prefersDark)) {
      setIsDarkMode(true)
    }

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark")
      setIsDarkMode(isDark)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  // Function to generate dashboard suggestions from AI
  const generateSuggestions = async () => {
    if (isLoadingSuggestions || columns.length === 0 || data.length === 0) return

    setIsLoadingSuggestions(true)

    try {
      const sampleData = data.slice(0, 3)
      const suggestionPrompt = `
        Based on the following data schema and sample data, suggest 3 different dashboard ideas that would be valuable.
        Return only 3 short, specific dashboard prompts (one sentence each) that a user could use to create a dashboard.
        Format your response as a JSON array of strings: ["suggestion1", "suggestion2", "suggestion3"]
        
        Columns: ${JSON.stringify(columns)}
        Sample data: ${JSON.stringify(sampleData)}
      `

      const response = await axios.post("/api/ai/dashboard", {
        content: suggestionPrompt,
      })

      let suggestions
      try {
        // Try to parse JSON from the response
        const responseText = response.data.content
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)

        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: Extract sentences and format as suggestions
          const sentences = responseText
            .split(/[.!?]/)
            .filter(Boolean)
            .map((s: string) => s.trim())
          suggestions = sentences.slice(0, 3).map((s: string) => s + (s.endsWith(".") ? "" : "."))
        }

        setAiSuggestions(suggestions)
      } catch (error) {
        console.error("Error parsing suggestions:", error)
        setAiSuggestions([
          "Create a performance overview dashboard with key metrics and trends",
          "Generate a data comparison dashboard with interactive charts",
          "Build a comprehensive analytics dashboard with insights and KPIs",
        ])
      }
    } catch (error) {
      console.error("Error getting suggestions:", error)
      // Fallback suggestions
      setAiSuggestions([
        "Create a performance overview dashboard with key metrics and trends",
        "Generate a data comparison dashboard with interactive charts",
        "Build a comprehensive analytics dashboard with insights and KPIs",
      ])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Apply selected layout template to the AI-generated config using the enhanced algorithm
  const applyLayoutToConfig = () => {
    if (!window.aiDashboardConfig) return

    // Estimated dashboard dimensions
    const containerWidth = window.innerWidth * 0.7
    const containerHeight = window.innerHeight * 0.7

    // Create a new config with improved layout using our enhanced algorithm
    let newConfig: AiDashboardConfig

    if (useStructuredLayout) {
      // Use the advanced layout algorithm with template approach
      newConfig = applyTemplateLayout(
        window.aiDashboardConfig,
        layoutTemplate, // "executive", "analytical", or "balanced"
        containerWidth,
        containerHeight,
      )
    } else {
      // Use the smart distribution algorithm without a specific template
      newConfig = smartDistributeElements(window.aiDashboardConfig, containerWidth, containerHeight)
    }

    // Update the parsed config for preview
    setParsedConfig(newConfig)
  }

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
      "Finalizing dashboard structure...",
    ]

    setThinkingStages(stages)

    // Reset progress
    setThinkingProgress(0)

    // Simulate progressive thinking for each stage
    let currentStage = 0
    const interval = setInterval(() => {
      setThinkingProgress((prev) => {
        const newProgress = prev + 1 / (stages.length * 3)

        // Move to next stage at certain thresholds
        if (newProgress > (currentStage + 1) / stages.length) {
          currentStage = Math.min(currentStage + 1, stages.length - 1)
        }

        return Math.min(newProgress, 0.95) // Cap at 95% to finish with response
      })

      // Clear when almost done
      if (currentStage >= stages.length - 1) {
        clearInterval(interval)
      }
    }, 750)

    return () => clearInterval(interval)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return

    // Start timing the response
    startTimeRef.current = Date.now()

    // Add user message to chat
    const userMessageId = generateMessageId()
    const userMessage = {
      id: userMessageId,
      role: "user" as const,
      content: inputMessage,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsProcessing(true)

    // Start thinking simulation
    const clearThinking = simulateThinking()

    try {
      // Prepare context for the AI
      const sampleData = data.slice(0, 5)

      // Define system prompt
      const systemPrompt = `You are an AI dashboard designer assistant. Based on the user's request and the data schema provided:
<think>
1. Ingest the schema/sample:
   • Identify numerical metrics, categorical dimensions, temporal dimensions, and hierarchical/grouped fields.
2. Suggest interactive controls:
   • For temporal dimensions → date picker or range slider.
   • For categorical dimensions → dropdown or multi‑select filter.
3. Map data to visualizations:
   • Time series → line chart.
   • Categorical comparisons → bar chart.
   • Part‑to‑whole → pie or treemap.
   • Correlations → scatter plot or heatmap.
   • Distributions → histogram or box plot.
   • Hierarchies → treemap.
4. Determine stat cards for key KPIs (e.g., sum, mean, max, min, count).
5. Automatically compute a unique, professional, and responsive layout:
   • Use a 12‑column grid or percentage‑based coordinates.
   • Algorithmically assign each element’s position and size to maximize readability and balance.
   • Maintain at least a 50 px (or 1 grid‑unit) gap between elements.
   • Validate all referenced columns exist in the schema.
</think>
Your final output must be valid JSON, wrapped in triple backticks (\`\`\`json … \`\`\`), with this structure:
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
 "position": {"x": 300, "y": 100, "width": 400, "height": 200}
 }
 ],
 "dataTables": [
 {
 "columns": ["column1", "column2", "column3"],
 "title": "Data Table Title",
 "position": {"x": 500, "y": 100, "width": 600, "height": 400}
 }
 ],
 "statCards": [
 {
 "column": "columnName",
 "statType": "count|sum|mean|mode|max|min",
 "title": "Stat Card Title",
 "position": {"x": 100, "y": 300, "width": 300, "height": 180}
 }
  "errors": [
    "columnNameX not found in schema"
  ]
}

IMPORTANT:
- Do **not** accept or reuse any user‑provided layout parameters.
- Compute all positions and sizes yourself based on content and dataset.
- Ensure the dashboard is balanced and visually coherent.
- Populate “errors” if any column references are invalid.
`; 
      // Combine the system prompt, user request, and data context
      const aiPrompt = `${systemPrompt}\n\nUser request: ${inputMessage}\n\nColumns: ${JSON.stringify(columns)}\n\nSample data: ${JSON.stringify(sampleData)}`

      // Call the AI API endpoint
      const response = await axios.post("/api/ai/dashboard", {
        content: aiPrompt,
      })

      // Record the response time
      const endTime = Date.now()
      const duration = (endTime - startTimeRef.current) / 1000

      // Extract the AI response
      const aiMessage = response.data.content
      const aiMessageId = generateMessageId()

      // Complete the thinking progress
      setThinkingProgress(1)

      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "assistant",
          content: aiMessage,
        },
      ])

      // Record response time
      setResponseTimes((prev) => ({
        ...prev,
        [aiMessageId]: duration,
      }))

      // Try to extract and parse the JSON configuration
      try {
        // Look for JSON in triple backticks
        const jsonMatch = aiMessage.match(/```(?:json)?\s*({[\s\S]*?})\s*```/)

        let parsedResponse
        if (jsonMatch && jsonMatch[1]) {
          parsedResponse = JSON.parse(jsonMatch[1])
        }
        // Try to find any JSON-like structure in the message
        else {
          const possibleJson = aiMessage.match(/{[\s\S]*?}/)
          if (possibleJson) {
            parsedResponse = JSON.parse(possibleJson[0])
          }
        }

        if (parsedResponse) {
          // Ensure the configuration has all required properties with defaults
          const completeConfig = {
            charts: parsedResponse.charts || [],
            textBoxes: parsedResponse.textBoxes || [],
            dataTables: parsedResponse.dataTables || [],
            statCards: parsedResponse.statCards || [],
          }

          // Apply the enhanced layout algorithm to improve element distribution
          const containerWidth = window.innerWidth * 0.7
          const containerHeight = window.innerHeight * 0.7

          // Use our enhanced algorithm to create a balanced layout
          const adjustedConfig = createDashboardLayout(completeConfig, containerWidth, containerHeight)

          // Store the sanitized configuration
          window.aiDashboardConfig = adjustedConfig
          console.log("Successfully parsed dashboard configuration:", adjustedConfig)

          // Automatically apply layout to config
          if (useStructuredLayout) {
            applyLayoutToConfig()
          } else {
            setParsedConfig(adjustedConfig)
          }
        } else {
          console.error("No valid JSON configuration found in AI response")
        }
      } catch (e) {
        console.error("Failed to parse JSON from AI response:", e)
      }
    } catch (error) {
      console.error("Error generating dashboard:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          role: "assistant",
          content:
            "Sorry, I encountered an error while creating your dashboard. Please try again with a different description.",
        },
      ])
    } finally {
      setIsProcessing(false)
      clearThinking()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
    // Automatically send the suggestion after a short delay
    setTimeout(() => handleSendMessage(), 100)
  }

  const handleCreateDashboard = () => {
    setIsCreating(true)

    setTimeout(() => {
      if (parsedConfig) {
        // Ensure all required properties exist before passing to parent
        const safeConfig: AiDashboardConfig = {
          charts: parsedConfig.charts || [],
          textBoxes: parsedConfig.textBoxes || [],
          dataTables: parsedConfig.dataTables || [],
          statCards: parsedConfig.statCards || [],
        }
        onCreateDashboard(safeConfig)
        onClose()
      } else if (window.aiDashboardConfig) {
        // Ensure all required properties exist before passing to parent
        const safeConfig: AiDashboardConfig = {
          charts: window.aiDashboardConfig.charts || [],
          textBoxes: window.aiDashboardConfig.textBoxes || [],
          dataTables: window.aiDashboardConfig.dataTables || [],
          statCards: window.aiDashboardConfig.statCards || [],
        }
        onCreateDashboard(safeConfig)
        onClose()
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: "assistant",
            content:
              "I need to generate a valid dashboard configuration first. Please try describing what you'd like to see in your dashboard.",
          },
        ])
        setIsCreating(false)
      }
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-0 bg-white dark:bg-slate-900 shadow-2xl border-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-200">
            <BrainCircuit className="h-6 w-6 text-indigo-500" />
            AI Dashboard Designer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat area with fixed height and scroll */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message) => {
                  const { think, rest } = parseContent(message.content)
                  return (
                    <div
                      key={message.id}
                      className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
                    >
                      <div className="flex items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                        {message.role === "user" ? (
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
                          message.role === "user"
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
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
                  )
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
                              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500 ease-in-out"
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
                                    : "text-slate-400 dark:text-slate-500",
                                )}
                              >
                                {thinkingProgress * thinkingStages.length > index && <Check className="h-3 w-3" />}
                                <span>{stage}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {window.aiDashboardConfig && !isProcessing && (
                  <div className="flex flex-col items-center w-full py-4 px-2 mt-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-300">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Dashboard design ready!</span>
                    </div>
                    <Button
                      size="lg"
                      className={cn(
                        "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all",
                        isCreating && "opacity-90",
                      )}
                      onClick={handleCreateDashboard}
                      disabled={isProcessing || isCreating}
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
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                >
                  {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* AI suggestions */}
          <div className="p-4 border-t dark:border-slate-700">
            <div className="max-w-3xl mx-auto">
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
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AiDashboardModal
