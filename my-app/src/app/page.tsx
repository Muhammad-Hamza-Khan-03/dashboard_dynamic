"use client";
import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Collapse,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material';
import {
  ArrowDown,
  Atom,
  BarChart,
  BarChart2,
  BookmarkCheckIcon,
  Bot,
  Brush,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  Copy,
  Database,
  Delete,
  Download,
  Edit,
  File,
  Filter,
  FileText,
  HelpCircle,
  Info,
  Layout,
  MessageCircle,
  Moon,
  MoreVertical,
  Palette,
  Paperclip,
  Plug,
  Save,
  Send,
  Settings,
  Share2,
  SidebarClose,
  SidebarOpen,
  Sun,
  TrendingUp,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import Papa from 'papaparse';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { read, utils } from 'xlsx';
import remarkGfm from 'remark-gfm';
type MessageType = "user" | "ai" | "system";

type Message = {
  id: number;
  type: MessageType;
  content: string;
  branchId: number;
  attachment?: any;
};

interface Branch {
  id: number;
  messages: Message[];
  graphs: { id: number; graph: any }[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'error';
}

interface Summary {
  rows: number;
  columns: number;
  numericColumns: string[];
  categoricalColumns: string[];
  columnsWithMissingValues: string[];
  columnTypes: { [key: string]: string };
}

interface DbInfo {
  [key: string]: { columns: string[] };
}

interface DetailedStats {
  describe: { [key: string]: any };
  correlation: { [key: string]: any };
}

interface Palette {
  name: string;
  colors: string[];
}

interface ParseResults {
  data: any[];
}

interface ColumnTypes {
  [key: string]: string;
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [branches, setBranches] = useState<Branch[]>([{ id: 0, messages: [], graphs: [] }]);
  const [currentBranchId, setCurrentBranchId] = useState(0);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const [openHelpDialog, setOpenHelpDialog] = useState(false);
  const [openSettingsMenu, setOpenSettingsMenu] = useState<null | HTMLElement>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [savedChats, setSavedChats] = useState<{ name: string; branches: Branch[] }[]>([]);
  const [openSaveChatDialog, setOpenSaveChatDialog] = useState(false);
  const [openDetailedStatsDialog, setOpenDetailedStatsDialog] = useState(false);
  const [chatName, setChatName] = useState('');
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [openSavedChats, setOpenSavedChats] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#0000ff');
  const [openBackgroundPicker, setOpenBackgroundPicker] = useState(false);
  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('data_visualization');
  const [openCustomInstructionsDialog, setOpenCustomInstructionsDialog] = useState(false);
  const [tempCustomInstructions, setTempCustomInstructions] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuChatIndex, setMenuChatIndex] = useState<null | number>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [edaProgress, setEdaProgress] = useState(0);
  const [edaCompleted, setEdaCompleted] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const backgroundRef = useRef(null);
  const colorRef = useRef(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const currentBranch = branches.find(branch => branch.id === currentBranchId);
  const backgroundColors = ['#ffffff', '#000000'];
  const datasetColors = ['#29BDFD', '#00CBBF', '#01C159', '#9DCA1C', '#FFAF00', '#F46920', '#F53255', '#F857C1'];

  const [expanded, setExpanded] = useState<string | false>(false);

  const defaultIconColor = darkMode ? '#ffffff' : '#000000';
  const customIconColors = useMemo(() => ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFA1', '#A133FF', '#FFA133', '#FF3333'], []);
  const iconColors = [defaultIconColor, ...customIconColors];
  const [detailedStats, setDetailedStats] = useState<DetailedStats>({ describe: {}, correlation: {} });
  const [loadingDetailedStats, setLoadingDetailedStats] = useState(true);

  const fetchDetailedStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/data_stats');
      if (!response.ok) {
        throw new Error('Failed to fetch detailed stats');
      }
      const data = await response.json();
      setDetailedStats(data);
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    } finally {
      setLoadingDetailedStats(false);
    }
  };

  useEffect(() => {
    if (edaCompleted && file) {
      fetchDetailedStats();
    }
  }, [edaCompleted, file]);

  const renderDescribeStats = (describeStats: { [key: string]: any }) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
        <BarChart size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Summary Statistics
      </Typography>
      <Grid container spacing={3}>
        {Object.entries(describeStats).map(([col, stats]) => (
          <Grid item xs={12} sm={6} md={4} key={col}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#333' }}>{col}</Typography>
              {Object.entries(stats).map(([stat, value]) => (
                <Chip
                  key={stat}
                  label={`${stat}: ${typeof value === 'number' ? value.toFixed(2) : value}`}
                  sx={{ m: 0.5, backgroundColor: '#e3f2fd', color: '#0d47a1' }}
                />
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderCorrelationMatrix = (correlationMatrix: { [key: string]: any }) => (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
        <TrendingUp size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Correlation Matrix
      </Typography>
      <TableContainer component={Paper} sx={{ maxWidth: '100%', overflow: 'auto' }}>
        <Table size="small" aria-label="correlation matrix" sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#bbdefb' }}>
              <TableCell />
              {Object.keys(correlationMatrix).map(key => (
                <TableCell key={key} align="center" sx={{ fontWeight: 'bold', color: '#0d47a1' }}>{key}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(correlationMatrix).map(([rowKey, rowValues]) => (
              <TableRow key={rowKey} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#e3f2fd' } }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: '#0d47a1' }}>{rowKey}</TableCell>
                {Object.values(rowValues).map((value, colIndex) => {
                  const correlationStrength = Math.abs(value as number);

                  let backgroundColor = '#ffffff';
                  if (correlationStrength > 0.7) backgroundColor = '#ef5350';
                  else if (correlationStrength > 0.5) backgroundColor = '#ff9800';
                  else if (correlationStrength > 0.3) backgroundColor = '#ffeb3b';
                  return (
                    <TableCell
                      key={colIndex}
                      align="center"
                      sx={{
                        backgroundColor,
                        color: correlationStrength > 0.5 ? '#ffffff' : '#000000',
                        fontWeight: correlationStrength > 0.7 ? 'bold' : 'normal'
                      }}
                    >
                      {(value as number).toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  useEffect(() => {
    const defaultIconColor = darkMode ? '#ffffff' : '#000000';
    setSelectedIconColor((prevColor) =>
      customIconColors.includes(prevColor) ? prevColor : defaultIconColor
    );
  }, [darkMode, customIconColors]);

  const [selectedIconColor, setSelectedIconColor] = useState(defaultIconColor);
  const seaPalettes: Palette[] = [
    { name: "Coastal Sunrise", colors: ["#E6A57E", "#4A919E", "#1E5666", "#F9D5BB", "#C3E5E9"] },
    { name: "Deep Ocean", colors: ["#05445E", "#189AB4", "#75E6DA", "#D4F1F4", "#B8E1DD"] },
    { name: "Tropical Waters", colors: ["#1A5F7A", "#86A8CF", "#57C5B6", "#B9D7EA", "#F1F9FD"] },
    { name: "Stormy Seas", colors: ["#1E2A3A", "#3A4F6F", "#6A8CAF", "#A9C1D9", "#E0EBF5"] },
    { name: "Beach Sunset", colors: ["#F9B248", "#E99357", "#2A628F", "#454D66", "#DF5E5E"] },
    { name: "Coral Reef", colors: ["#FF7F50", "#20B2AA", "#40E0D0", "#008080", "#FFA07A"] },
    { name: "Arctic Ice", colors: ["#5EA2C4", "#8DCBE6", "#C4E4F2", "#E8F4F8", "#FFFFFF"] },
    { name: "Seashell", colors: ["#FFF5E1", "#FFE0BD", "#FF8641", "#FFA56B", "#FFC49B"] }
  ];

  const rosePalettes: Palette[] = [
    { name: "English Rose Garden", colors: ["#F8E5E5", "#B74F4F", "#F9C0C0", "#E07A7A", "#EE9B9B"] },
    { name: "Wild Rose", colors: ["#FAD2E1", "#E6739F", "#AD3E5C", "#CC517A", "#F7A8C9"] },
    { name: "Rose Gold", colors: ["#FADADD", "#D17171", "#E38B8B", "#F2A6A6", "#F9C0C0"] },
    { name: "Dusty Rose", colors: ["#E8D3D3", "#BC8181", "#8F3232", "#A65959", "#D3A7A7"] },
    { name: "Romantic Bouquet", colors: ["#FFF0F5", "#FF1493", "#C71585", "#FF69B4", "#FFB6C1"] },
    { name: "Rose Quartz", colors: ["#F7CAC9", "#EB5A6D", "#EE7785", "#F1939B", "#F4AFB0"] },
    { name: "Vintage Rose", colors: ["#EED8D3", "#C37D6F", "#D49B8D", "#E5B8AE", "#B25F50"] },
    { name: "Desert Rose", colors: ["#FFC0CB", "#FF6B8B", "#FF8598", "#FF9AA2", "#FFB3BA"] }
  ];

  const forestPalettes: Palette[] = [
    { name: "Pine Forest", colors: ["#1A4314", "#40A037", "#337F2A", "#265C1D", "#5FC16B"] },
    { name: "Autumn Leaves", colors: ["#8B4513", "#CD853F", "#D2691E", "#DEB887", "#A0522D"] },
    { name: "Misty Woods", colors: ["#2F4F4F", "#5BAFAF", "#4C8F8F", "#3D6F6F", "#6ACFCF"] },
    { name: "Forest Floor", colors: ["#3E2723", "#795548", "#5D4037", "#A1887F", "#BCAAA4"] },
    { name: "Sunlit Glade", colors: ["#90EE90", "#7CFC00", "#98FB98", "#00FF00", "#32CD32"] },
    { name: "Enchanted Forest", colors: ["#004B49", "#03D3CF", "#016A67", "#029E9A", "#04FFFA"] },
    { name: "Mossy Rocks", colors: ["#2E4600", "#7FBF00", "#486B00", "#669900", "#99E600"] },
    { name: "Woodland Creatures", colors: ["#8B4513", "#F4A460", "#CD853F", "#DEB887", "#A0522D"] }
  ];
  const [selectedPalette, setSelectedPalette] = useState<Palette | null>(null);

  const getTextColor = (backgroundColor: string) => {
    const color = backgroundColor.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? '#000000' : '#ffffff';
  };

  const theme = useMemo(() => {
    const baseTheme = createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: darkMode ? '#ffffff' : '#000000',
        },
        background: {
          default: darkMode ? '#121212' : '#ffffff',
          paper: darkMode ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: darkMode ? '#ffffff' : '#000000',
        },
      },
    });

    if (selectedPalette) {
      const [primaryColor, secondaryColor, ...restColors] = selectedPalette.colors;
      const textColor = getTextColor(restColors[0]);
      return createTheme({
        ...baseTheme,
        palette: {
          primary: { main: primaryColor },
          secondary: { main: secondaryColor },
          background: { default: restColors[0], paper: restColors[1] },
          text: { primary: textColor, secondary: restColors[3] },
        },
      });
    }
    return baseTheme;
  }, [darkMode, selectedPalette]);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      setDarkMode(false);
      setSelectedPalette(null);
    } else if (theme === 'dark') {
      setDarkMode(true);
      setSelectedPalette(null);
    }
  };

  useEffect(() => {
    const chatContainer = chatContainerRef.current;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    });
    if (chatContainer) {
      ro.observe(chatContainer);
    }

    return () => {
      if (chatContainer) {
        ro.unobserve(chatContainer);
      }
    };
  }, [messages, currentBranchId]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        setShowScrollToBottom(chatContainerRef.current.scrollTop < chatContainerRef.current.scrollHeight - chatContainerRef.current.clientHeight);
      }
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setEdaCompleted(false);
    setEdaProgress(0);
    setSheetNames([]);
    setSelectedSheet('');

    const formData = new FormData();
    formData.append('file', file);

    let columns: string[] = [];
    let previewRows: any[] = [];
    let allRows: any[] = [];
    const numRowsToDisplay = 10;
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    const isValidDate = (dateString: string): boolean => {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };

    const isTimestamp = (value: any): boolean => {
      return !isNaN(value) && value.toString().length === 10;
    };

    const isPythonList = (value: string): boolean => {
      return typeof value === 'string' && value.startsWith('[') && value.endsWith(']');
    };

    const isPythonDict = (value: string): boolean => {
      return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
    };

    const isPythonSet = (value: string): boolean => {
      return typeof value === 'string' && value.startsWith('{') && value.endsWith('}') && !value.includes(':');
    };

    const processChunk = (results: Papa.ParseResult<any>, parser: any) => {
      if (!columns.length) {
        columns = results.meta.fields || [];
      }
      previewRows = results.data.slice(0, numRowsToDisplay).map((row: any) => Object.values(row));
      setTableData({ columns, rows: previewRows });

      allRows = allRows.concat(results.data);

      if (results.errors.length) {
        console.error('Errors in chunk:', results.errors);
      }
      setEdaProgress((prev) => prev + results.data.length);
    };

    const parsePreview = (): Promise<ParseResults> => {
      return new Promise((resolve, reject) => {
        if (fileExtension === 'csv' || fileExtension === 'tsv') {
          const separator = fileExtension === 'tsv' ? '\t' : ',';
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: separator,
            chunk: processChunk,
            complete: (results) => {
              if (results && results.data) {
                resolve({ data: results.data || [] });
              } else {
                resolve({ data: [] });
              }
            },
            error: reject,
          });
        } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
          const reader = new FileReader();
          reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = read(data, { type: 'array' });
            const sheetNames = workbook.SheetNames;
            setSheetNames(sheetNames);
            const sheetName = sheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonSheet = utils.sheet_to_json<any[][]>(worksheet, { header: 1 });
            columns = jsonSheet[0] as unknown as string[];
            previewRows = jsonSheet.slice(1, numRowsToDisplay + 1);
            allRows = jsonSheet.slice(1).map((row: any[]) => {
              const obj: { [key: string]: any } = {};
              columns.forEach((col, idx) => {
                obj[col] = row[idx];
              });
              return obj;
            });
            resolve({ data: allRows });
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'sqlite' || fileExtension === 'db') {
          resolve({ data: [] });
        } else if (['pdf', 'txt', 'rtf', 'doc', 'docx'].includes(fileExtension)) {
          resolve({ data: [] }); // These file types don't need data processing here
        } else {
          reject(new Error('Unsupported file type'));
        }
      });
    };

    try {
      setLoading(true);
      const results = await parsePreview();
      const allRowsData = results?.data?.length ? results.data : allRows;

      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        setMessages((prev) => [...prev, { id: Date.now(), type: 'system', content: data.message, branchId: 0 }]);
        setSnackbar({ open: true, message: 'File uploaded successfully', severity: 'success' });
        setSuggestedPrompts(data.suggested_prompts);

        if (data.db_info) {
          setDbInfo(data.db_info);
        }

        if (['csv', 'tsv', 'xls', 'xlsx'].includes(fileExtension)) {
          if (columns.length > 0 && allRowsData.length > 0) {
            const columnTypes: ColumnTypes = {};
            const numericColumns: string[] = [];
            const categoricalColumns: string[] = [];
            const columnsWithMissingValues: string[] = [];

            columns.forEach((col) => {
              const colValues = allRowsData.map((row) => row[col]);
              const nonNullValues = colValues.filter((value) => value !== undefined && value !== null);

              const missingValuesCount = colValues.filter((value) => value === null || value === '').length;

              if (missingValuesCount > 0) {
                columnsWithMissingValues.push(col);
              }

              if (nonNullValues.length === 0) {
                columnTypes[col] = 'Empty';
              } else if (nonNullValues.every((value) => !isNaN(parseFloat(value)) && isFinite(value))) {
                if (nonNullValues.every((value) => Number.isInteger(parseFloat(value)))) {
                  if (nonNullValues.every((value) => parseInt(value) === 0 || parseInt(value) === 1)) {
                    columnTypes[col] = 'Bool (0/1)';
                  } else {
                    columnTypes[col] = 'Int';
                  }
                } else {
                  columnTypes[col] = 'Float';
                }
                numericColumns.push(col);
              } else if (nonNullValues.every(isValidDate)) {
                columnTypes[col] = 'Datetime';
              } else if (nonNullValues.every(isTimestamp)) {
                columnTypes[col] = 'Timestamp';
              } else if (nonNullValues.every((value) => typeof value === 'boolean' || (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')))) {
                columnTypes[col] = 'Bool';
              } else if (nonNullValues.every(isPythonList)) {
                columnTypes[col] = 'List';
              } else if (nonNullValues.every(isPythonDict)) {
                columnTypes[col] = 'Dict';
              } else if (nonNullValues.every(isPythonSet)) {
                columnTypes[col] = 'Set';
              } else {
                const uniqueValues = new Set(nonNullValues);
                if (uniqueValues.size <= 10 && uniqueValues.size / nonNullValues.length < 0.5) {
                  columnTypes[col] = 'Category';
                  categoricalColumns.push(col);
                } else {
                  columnTypes[col] = 'Object';
                }
              }
            });

            setSummary({
              rows: allRowsData.length,
              columns: columns.length,
              numericColumns,
              categoricalColumns,
              columnsWithMissingValues,
              columnTypes,
            });
          }
        } else if (['pdf', 'txt', 'rtf', 'doc', 'docx'].includes(fileExtension)) {
          setSelectedAgent('research_assistant');
        }

        setEdaCompleted(true);
      } else {
        const text = await response.text();
        throw new Error(`Server responded with non-JSON data: ${text}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setSnackbar({ open: true, message: `Error uploading file: ${(error as Error).message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (event: SelectChangeEvent<string>) => {
    const sheetName = event.target.value;
    setSelectedSheet(sheetName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: 'array' });
      const worksheet = workbook.Sheets[sheetName];
      const jsonSheet = utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      const columns = jsonSheet[0];
      const previewRows = jsonSheet.slice(1, 10 + 1);
      setTableData({ columns, rows: previewRows });

      const isValidDate = (dateString: string) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
      };

      const isTimestamp = (value: any) => !isNaN(value) && value.toString().length === 10;

      const isPythonList = (value: string) => typeof value === 'string' && value.startsWith('[') && value.endsWith(']');

      const isPythonDict = (value: string) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

      const isPythonSet = (value: string) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}') && !value.includes(':');

      const allRows = jsonSheet.slice(1).map(row => {
        const obj: { [key: string]: any } = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      const rowCount = allRows.length;

      const columnTypes: { [key: string]: string } = {};
      const numericColumns: string[] = [];
      const categoricalColumns: string[] = [];
      const columnsWithMissingValues: string[] = [];

      columns.forEach((col) => {
        const colValues = allRows.map(row => row[col]);
        const nonNullValues = colValues.filter(value => value !== undefined && value !== null);

        const missingValuesCount = colValues.filter(value => value === null || value === '').length;

        if (missingValuesCount > 0) {
          columnsWithMissingValues.push(col);
        }

        if (nonNullValues.length === 0) {
          columnTypes[col] = 'Empty';
        } else if (nonNullValues.every(value => !isNaN(parseFloat(value)) && isFinite(value))) {
          if (nonNullValues.every(value => Number.isInteger(parseFloat(value)))) {
            if (nonNullValues.every(value => parseInt(value) === 0 || parseInt(value) === 1)) {
              columnTypes[col] = 'Bool (0/1)';
            } else {
              columnTypes[col] = 'Int';
            }
          } else {
            columnTypes[col] = 'Float';
          }
        } else if (nonNullValues.every(isValidDate)) {
          columnTypes[col] = 'Datetime';
        } else if (nonNullValues.every(isTimestamp)) {
          columnTypes[col] = 'Timestamp';
        } else if (nonNullValues.every(value => typeof value === 'boolean' || (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')))) {
          columnTypes[col] = 'Bool';
        } else if (nonNullValues.every(isPythonList)) {
          columnTypes[col] = 'List';
        } else if (nonNullValues.every(isPythonDict)) {
          columnTypes[col] = 'Dict';
        } else if (nonNullValues.every(isPythonSet)) {
          columnTypes[col] = 'Set';
        } else {
          const uniqueValues = new Set(nonNullValues);
          if (uniqueValues.size <= 10 && uniqueValues.size / nonNullValues.length < 0.5) {
            columnTypes[col] = 'Category';
          } else {
            columnTypes[col] = 'Object';
          }
        }
      });

      setSummary({
        rows: rowCount,
        columns: columns.length,
        numericColumns,
        categoricalColumns,
        columnsWithMissingValues,
        columnTypes,
      });
    };
    reader.readAsArrayBuffer(file as Blob);
  };


  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { id: Date.now(), type: 'user', content: input, branchId: currentBranchId };
    setMessages((prev) => [...prev, newMessage]);
    setBranches((branches) => {
      const updatedBranches = branches.map((branch) => {
        if (branch.id === currentBranchId) {
          return { ...branch, messages: [...branch.messages, newMessage] };
        }
        return branch;
      });
      return updatedBranches;
    });
    setInput('');

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          agent_type: selectedAgent,
          custom_instructions: customInstructions,
        }),
      });
      const data = await response.json();
      const aiMessage: Message = { id: Date.now(), type: 'ai', content: data.output, branchId: currentBranchId };
      setMessages((prev) => [...prev, aiMessage]);
      setBranches((branches) => {
        const updatedBranches = branches.map((branch) => {
          if (branch.id === currentBranchId) {
            return { ...branch, messages: [...branch.messages, aiMessage] };
          }
          return branch;
        });
        return updatedBranches;
      });
      if (data.graph) {
        setBranches((branches) => {
          const updatedBranches = branches.map((branch) => {
            if (branch.id === currentBranchId) {
              return { ...branch, graphs: [...branch.graphs, { id: aiMessage.id, graph: JSON.parse(data.graph) }] };
            }
            return branch;
          });
          return updatedBranches;
        });
      }
      if (data.suggestions) {
        setSuggestedPrompts(data.suggestions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbar({ open: true, message: 'Error sending message', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const SQLStructureVisualization: React.FC<{ dbInfo: DbInfo, darkMode: boolean }> = ({ dbInfo, darkMode }) => {
    const [expandedTables, setExpandedTables] = useState<{ [key: string]: boolean }>({});

    const toggleTable = (tableName: string) => {
      setExpandedTables(prev => ({
        ...prev,
        [tableName]: !prev[tableName]
      }));
    };

    const handleTableClick = (tableName: string) => {
      setCurrentQuery((prevQuery) => {
        const trimmedPrevQuery = prevQuery.trim();
        const separator = trimmedPrevQuery.endsWith(',') ? ' ' : trimmedPrevQuery ? ', ' : '';
        return `${trimmedPrevQuery}${separator}${tableName}`;
      });
      setInput((prevInput) => {
        const trimmedPrevInput = prevInput.trim();
        const separator = trimmedPrevInput.endsWith(',') ? ' ' : trimmedPrevInput ? ', ' : '';
        return `${trimmedPrevInput}${separator}${tableName}`;
      });
    };

    const handleColumnClick = (columnName: string) => {
      setCurrentQuery((prevQuery) => {
        const trimmedPrevQuery = prevQuery.trim();
        const separator = trimmedPrevQuery.endsWith(',') ? ' ' : trimmedPrevQuery ? ', ' : '';
        return `${trimmedPrevQuery}${separator}${columnName}`;
      });
      setInput((prevInput) => {
        const trimmedPrevInput = prevInput.trim();
        const separator = trimmedPrevInput.endsWith(',') ? ' ' : trimmedPrevInput ? ', ' : '';
        return `${trimmedPrevInput}${separator}${columnName}`;
      });
    };

    const styles = {
      container: {
        padding: '16px',
        fontFamily: 'Arial, sans-serif',
        color: darkMode ? '#ffffff' : '#000000',
      },
      grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      },
      card: {
        border: darkMode ? '1px solid #444' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: darkMode ? '0 2px 4px rgba(255, 255, 255, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        backgroundColor: darkMode ? '#333' : '#f9f9f9',
      },
      button: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        background: 'none',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '8px 0',
        marginBottom: '8px',
        color: darkMode ? '#ffffff' : '#000000',
      },
      icon: {
        transition: 'transform 0.2s',
      },
      columnsContainer: {
        display: 'flex',
        flexWrap: 'wrap' as 'wrap',
        gap: '4px',
      },
      columnBox: {
        backgroundColor: darkMode ? '#555' : '#e0e0e0',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '14px',
        marginBottom: '4px',
      },
      tableButton: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        background: 'none',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '8px 0',
        marginBottom: '8px',
        color: darkMode ? '#ffffff' : '#000000',
      },
      columnButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px 8px',
        marginBottom: '4px',
        borderRadius: '4px',
        color: darkMode ? '#ffffff' : '#000000',
        '&:hover': {
          backgroundColor: darkMode ? '#555' : '#e0e0e0',
        },
      },
    };

    return (
      <div style={styles.container}>
        <div style={styles.grid}>
          {Object.entries(dbInfo).map(([tableName, tableInfo]) => (
            <div key={tableName} style={styles.card}>
              <button
                onClick={() => toggleTable(tableName)}
                style={styles.tableButton}
              >
                <span onClick={(e) => { e.stopPropagation(); handleTableClick(tableName); }}>{tableName}</span>
                {expandedTables[tableName] ?
                  <ChevronDown size={20} style={{ ...styles.icon, transform: expandedTables[tableName] ? 'rotate(180deg)' : 'rotate(0deg)' }} /> :
                  <ChevronRight size={20} style={styles.icon} />}
              </button>
              {expandedTables[tableName] && (
                <div style={styles.columnsContainer}>
                  {tableInfo.columns.map((column, index) => (
                    <button
                      key={index}
                      style={styles.columnButton}
                      onClick={() => handleColumnClick(column)}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAccordion = (title: string, content: React.ReactNode, panel: string) => (
    <Accordion
      expanded={expanded === panel}
      onChange={handleChange(panel)}
      elevation={0}
      sx={{
        '&:before': { display: 'none' },
        backgroundColor: 'transparent',
      }}
    >
      <AccordionSummary
        expandIcon={expanded === panel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          borderRadius: '4px',
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
        }}
      >
        <Typography variant="subtitle1">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ maxHeight: '200px', overflowY: 'auto' }}>
        {content}
      </AccordionDetails>
    </Accordion>
  );

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
    });
  };

  const handleDownloadChat = () => {
    const chatContent = messages.map(msg => `${msg.type}: ${msg.content}`).join('\n\n');
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_history.txt';
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Chat history downloaded', severity: 'success' });
  };

  const handleSaveChat = () => {
    if (chatName.trim()) {
      setSavedChats([...savedChats, { name: chatName, branches }]);
      setOpenSaveChatDialog(false);
      setChatName('');
      setSnackbar({ open: true, message: 'Chat saved successfully', severity: 'success' });
    }
  };

  const handleLoadChat = (index: number) => {
    const loadedChat = savedChats[index];
    setBranches(loadedChat.branches);
    setCurrentBranchId(0);
    setSnackbar({ open: true, message: 'Chat loaded successfully', severity: 'success' });
  };

  const handleDeleteChat = (index: number) => {
    const newSavedChats = savedChats.filter((_, i) => i !== index);
    setSavedChats(newSavedChats);
  };

  const handleRenameChat = (index: number, newName: string | null) => {
    if (newName) {
      const newSavedChats = savedChats.map((chat, i) => {
        if (i === index) {
          return { ...chat, name: newName };
        }
        return chat;
      });
      setSavedChats(newSavedChats);
      setSnackbar({ open: true, message: 'Chat renamed successfully', severity: 'success' });
    }
  };

  const handleShareChat = (index: number) => {
    // Implement the share functionality
    console.log('Share chat:', savedChats[index]);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuChatIndex(index);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuChatIndex(null);
  };

  const handleIconColorChange = (color: string) => {
    setSelectedIconColor(color);
    setOpenColorPicker(false);
  };

  const handleSaveCustomInstructions = () => {
    setCustomInstructions(tempCustomInstructions);
    setOpenCustomInstructionsDialog(false);
    setSnackbar({ open: true, message: 'Custom instructions saved', severity: 'success' });
  };

  const handleClearCustomInstructions = () => {
    setTempCustomInstructions('');
    setCustomInstructions('');
    setOpenCustomInstructionsDialog(false);
    setSnackbar({ open: true, message: 'Custom instructions cleared', severity: 'info' });
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const renderSuggestedPrompts = () => {
    if (!suggestedPrompts || suggestedPrompts.length === 0) {
      return null;
    }

    return suggestedPrompts.map((suggestion, index) => (
      <Chip
        key={index}
        label={suggestion}
        onClick={() => handleSuggestedPromptClick(suggestion)}
        sx={{ margin: '0.5rem' }}
      />
    ));
  };

  const renderTable = (data: { columns: string[], rows: any[] }) => {
    const handleColumnClick = (columnName: string) => {
      setCurrentQuery((prevQuery) => {
        const trimmedPrevQuery = prevQuery.trim();
        const separator = trimmedPrevQuery.endsWith(',') ? ' ' : trimmedPrevQuery ? ', ' : '';
        return `${trimmedPrevQuery}${separator}${columnName}`;
      });
      setInput((prevInput) => {
        const trimmedPrevInput = prevInput.trim();
        const separator = trimmedPrevInput.endsWith(',') ? ' ' : trimmedPrevInput ? ', ' : '';
        return `${trimmedPrevInput}${separator}${columnName}`;
      });
    };

    return (
      <Box sx={{ position: 'relative' }}>
        <TableContainer
          component={Paper}
          sx={{
            maxWidth: '100%',
            overflowX: 'auto',
            maxHeight: '400px',
            boxShadow: 3,
            borderRadius: 2,
            '&::-webkit-scrollbar': {
              width: '10px',
              height: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,.2)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,.1)',
              borderRadius: '10px',
            },
          }}
        >
          <Table size="small" stickyHeader aria-label="enhanced table">
            <TableHead>
              <TableRow>
                {data.columns.map((col, index) => (
                  <TableCell
                    key={index}
                    onClick={() => handleColumnClick(col)}
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: (theme) => theme.palette.primary.main,
                      color: (theme) => theme.palette.primary.contrastText,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '200px',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.primary.dark,
                      },
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: (theme) => theme.palette.action.hover },
                    '&:hover': { backgroundColor: (theme) => theme.palette.action.selected },
                  }}
                >
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '200px',
                        '&:hover': {
                          overflow: 'visible',
                          whiteSpace: 'normal',
                          height: 'auto',
                        },
                      }}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const handleEdit = (messageId: number, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
  };

  const handleSaveEdit = async (messageId: number) => {
    const updatedMessages = messages.map((msg) => {
      if (msg.id === messageId) {
        return { ...msg, content: editedContent, edited: true };
      }
      return msg;
    });

    const newBranchId = branches.length;
    const editedIndex = updatedMessages.findIndex((msg) => msg.id === messageId);
    const newBranchMessages = updatedMessages.slice(0, editedIndex + 1);
    const newBranchGraphs = branches[currentBranchId].graphs.filter((graph) => graph.id <= messageId);

    setBranches([...branches, { id: newBranchId, messages: newBranchMessages, graphs: newBranchGraphs }]);
    setCurrentBranchId(newBranchId);
    setEditingMessageId(null);
    setEditedContent('');

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: editedContent,
          agent_type: selectedAgent,
          custom_instructions: customInstructions,
        }),
      });
      const data = await response.json();
      const aiMessage: Message = { id: Date.now(), type: 'ai' as MessageType, content: data.output, branchId: newBranchId };
      setMessages((prev) => [...prev, aiMessage]);
      setBranches((branches) => {
        const updatedBranches = branches.map((branch) => {
          if (branch.id === newBranchId) {
            return { ...branch, messages: [...branch.messages, aiMessage] };
          }
          return branch;
        });
        return updatedBranches;
      });
      if (data.graph) {
        setBranches((branches) => {
          const updatedBranches = branches.map((branch) => {
            if (branch.id === newBranchId) {
              return { ...branch, graphs: [...branch.graphs, { id: aiMessage.id, graph: JSON.parse(data.graph) }] };
            }
            return branch;
          });
          return updatedBranches;
        });
      }
    } catch (error) {
      console.error('Error sending edited message:', error);
      setSnackbar({ open: true, message: 'Error updating message', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const handleBackgroundColorChange = (color: string) => {
    setSelectedBackground(color);
    setOpenBackgroundPicker(false);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setOpenColorPicker(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  const handleCustomColorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (/^#[0-9A-F]{6}$/i.test(customColor)) {
      setSelectedColor(customColor);
      setOpenColorPicker(false);
    }
  };

  const handleBranchNavigation = (direction: 'prev' | 'next', messageId: number) => {
    const editedBranches = branches.filter(branch => 
      branch.messages.some(m => m.id === messageId)
    );
    const currentEditIndex = editedBranches.findIndex(branch => branch.id === currentBranchId);
    
    if (direction === 'prev' && currentEditIndex > 0) {
      setCurrentBranchId(editedBranches[currentEditIndex - 1].id);
    } else if (direction === 'next' && currentEditIndex < editedBranches.length - 1) {
      setCurrentBranchId(editedBranches[currentEditIndex + 1].id);
    }
  };

  const handleScrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };
  const exportGraphAsJSON = async (graph: any) => {
    try {
      const response = await fetch('http://localhost:5000/export_graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph: JSON.stringify(graph) }),
      });

      if (!response.ok) {
        throw new Error('Failed to export graph');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error exporting graph:', error);
      setSnackbar({ open: true, message: 'Error exporting graph', severity: 'error' });
    }
  };

  const toggleCodeBlock = (messageId: number, codeIndex: number) => {
    setExpandedCodeBlocks(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [codeIndex]: !prev[messageId]?.[codeIndex]
      }
    }));
  };

  const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const [isExpanded, setIsExpanded] = useState(false);

    if (!inline && match) {
      return (
        <Box sx={{ width: '100%', mt: 2 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            {isExpanded ? 'Hide' : 'Show'} code
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          <Collapse in={isExpanded}>
            <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflowX: 'auto' }}>
              <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div">
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </Box>
          </Collapse>
        </Box>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const renderMessages = () => {
    const currentBranch = branches.find(branch => branch.id === currentBranchId);
    if (!currentBranch) return null;
  
    return currentBranch.messages.map((message, messageIndex) => {
      const editedBranches = branches.filter(branch => 
        branch.messages.some(m => m.id === message.id)
      );
      const isEdited = editedBranches.length > 1;
      const currentEditIndex = editedBranches.findIndex(branch => branch.id === currentBranchId) + 1;
      const totalEdits = editedBranches.length;
  
      return (
        <Box
          key={messageIndex}
          sx={{
            display: 'flex',
            justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
            mb: 2,
          }}
        >
          <Card
            sx={{
              maxWidth: '70%',
              borderRadius: 2,
              position: 'relative',
              backgroundColor: 'background.paper',
              color: 'text.primary',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
              {message.type === 'user' ? (
                <User size={20} style={{ marginRight: '8px', flexShrink: 0 }} />
              ) : (
                <Bot size={20} style={{ marginRight: '8px', flexShrink: 0 }} />
              )}
              {editingMessageId === message.id ? (
                <TextField
                  fullWidth
                  multiline
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  sx={{ mt: 1 }}
                />
              ) : (
                <ReactMarkdown
                  components={{
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const [isExpanded, setIsExpanded] = useState(false);
  
                      if (!match) {
                        return <code className={className}>{children}</code>;
                      }
  
                      return (
                        <Box sx={{ width: '100%', mt: 2 }}>
                          <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            startIcon={isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            sx={{ mb: 1, textTransform: 'none' }}
                          >
                            {isExpanded ? 'Hide' : 'Show'} code
                          </Button>
                          <Collapse in={isExpanded}>
                            <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflowX: 'auto' }}>
                              <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div">
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    },
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {message.content}
                </ReactMarkdown>
              )}
              {currentBranch.graphs
                .filter((graph) => graph.id === message.id)
                .map((graph, graphIndex) => (
                  <Box key={graphIndex} sx={{ width: '100%', my: 2 }}>
                    <Plot
                      data={graph.graph.data.map((trace) => ({
                        ...trace,
                        marker: {
                          ...trace.marker,
                          color: selectedColor,
                        },
                      }))}
                      layout={{
                        ...graph.graph.layout,
                        width: '100%',
                        height: 400,
                        plot_bgcolor: selectedBackground,
                        paper_bgcolor: selectedBackground,
                        font: {
                          color: selectedBackground === '#000000' ? '#ffffff' : selectedBackground === '#ffffff' ? selectedColor : '#000000'
                        },
                      }}
                      config={{ responsive: true }}
                    />
                    <Tooltip title="Export Graph as JSON">
                      <IconButton
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => exportGraphAsJSON(graph.graph)}
                      >
                        <BookmarkCheckIcon size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              {message.type === 'user' && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                  <IconButton size="small" onClick={() => handleBranchNavigation('prev', message.id)} disabled={currentEditIndex === 1}>
                    <ChevronLeft size={16} style={{ color: selectedIconColor }} />
                  </IconButton>
                  {isEdited && (
                    <Typography variant="caption" sx={{ mx: 1 }}>
                      {currentEditIndex}/{totalEdits}
                    </Typography>
                  )}
                  <IconButton size="small" onClick={() => handleBranchNavigation('next', message.id)} disabled={currentEditIndex === totalEdits}>
                    <ChevronRight size={16} style={{ color: selectedIconColor }} />
                  </IconButton>
                </Box>
              )}
            </CardContent>
            {message.type === 'user' && (
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                {editingMessageId === message.id ? (
                  <>
                    <IconButton size="small" onClick={() => handleSaveEdit(message.id)}>
                      <Check size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancelEdit}>
                      <X size={16} />
                    </IconButton>
                  </>
                ) : (
                  <IconButton size="small" onClick={() => handleEdit(message.id, message.content)}>
                    <Edit size={16} />
                  </IconButton>
                )}
              </Box>
            )}
            {message.type === 'ai' && (
              <Tooltip title="Copy to clipboard">
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={() => handleCopyToClipboard(message.content)}
                >
                  <Copy size={16} />
                </IconButton>
              </Tooltip>
            )}
            {message.attachment && renderAttachment(message.attachment)}
          </Card>
        </Box>
      );
    });
  };

  const renderAttachment = (attachment: { name: string, type: string, size: number }) => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>File Name:</strong> {attachment.name}
        </Typography>
        <Typography variant="body2">
          <strong>File Type:</strong> {attachment.type}
        </Typography>
        <Typography variant="body2">
          <strong>File Size:</strong> {(attachment.size / 1024).toFixed(2)} KB
        </Typography>
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                background: darkMode ? 'linear-gradient(45deg, #2b2b2b 30%, #3f3f3f 90%)' : 'linear-gradient(45deg, #f0f0f0 30%, #e0e0e0 90%)',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Box
                component="span"
                sx={{
                  background: darkMode ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)' : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900,
                }}
              >
                InSight
              </Box>
              <Box component="span" sx={{ ml: 1, fontSize: '0.8em', fontWeight: 600, opacity: 0.8 }}>
                AI
              </Box>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 200,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                }}
              >
                <Select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value as string)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                          <Typography variant="caption">Agent</Typography>
                          <Tooltip title="Select an agent">
                            <IconButton size="small">
                              <Info size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    }

                    const selectedAgent = [
                      { value: 'data_visualization', label: 'Data Visualization', icon: <BarChart2 size={24} style={{ color: selectedIconColor }} /> },
                      { value: 'sql', label: 'SQL', icon: <Database size={24} style={{ color: selectedIconColor }} /> },
                      { value: 'business_analytics', label: 'Business Analytics', icon: <TrendingUp size={24} style={{ color: selectedIconColor }} /> },
                      { value: 'data_cleaning', label: 'Data Cleaning', icon: <Filter size={24} style={{ color: selectedIconColor }} /> },
                      { value: 'research_assistant', label: 'Research Assistant', icon: <FileText size={24} style={{ color: selectedIconColor }} /> },
                    ].find(agent => agent.value === selected);

                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {selectedAgent?.icon}
                        {selectedAgent?.label}
                      </Box>
                    );
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 'auto',
                        borderRadius: '16px',
                        '& .MuiMenuItem-root': {
                          py: 1.5,
                          px: 2,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        },
                      },
                    },
                  }}
                >
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 0.5 }}>
                      <Typography variant="caption">Agent</Typography>
                      <Tooltip title="Select an agent">
                        <IconButton size="small">
                          <Info size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </MenuItem>
                  <Divider />
                  {[
                    { value: 'data_visualization', label: 'Data Visualization', icon: <BarChart2 size={24} />, description: 'Visualize your data with interactive charts.' },
                    { value: 'sql', label: 'SQL', icon: <Database size={24} />, description: 'Manage and query your databases efficiently.' },
                    { value: 'business_analytics', label: 'Business Analytics', icon: <TrendingUp size={24} />, description: 'Analyze business metrics and trends.' },
                    { value: 'data_cleaning', label: 'Data Cleaning', icon: <Filter size={24} />, description: 'Clean and preprocess your data for analysis.' },
                    { value: 'research_assistant', label: 'Research Assistant', icon: <FileText size={24} />, description: "Analyze and answer questions about documents." }
                  ].map((agent) => (
                    <MenuItem key={agent.value} value={agent.value}>
                      {agent.icon}
                      <Box>
                        <Typography variant="body1">{agent.label}</Typography>
                        <Typography variant="caption" color="textSecondary">{agent.description}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[
                  { title: 'Help', icon: <HelpCircle size={20} />, onClick: () => setOpenHelpDialog(true) },
                  { title: 'Settings', icon: <Settings size={20} />, onClick: (e) => setOpenSettingsMenu(e.currentTarget) },
                  { title: 'Download Chat History', icon: <Download size={20} />, onClick: handleDownloadChat },
                  { title: 'Save Chat', icon: <Save size={20} />, onClick: () => setOpenSaveChatDialog(true) },
                  { title: darkMode ? 'Light Mode' : 'Dark Mode', icon: darkMode ? <Sun size={20} /> : <Moon size={20} />, onClick: () => setDarkMode(!darkMode) },
                  { title: 'Saved Chats', icon: <SidebarOpen size={20} />, onClick: () => setOpenSavedChats(true) },
                ].map((item, index) => (
                  <Tooltip key={index} title={item.title}>
                    <IconButton
                      onClick={item.onClick}
                      color="inherit"
                      sx={{
                        backgroundColor: 'action.selected',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      {React.cloneElement(item.icon, { style: { color: selectedIconColor } })}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          <Drawer
            anchor="left"
            open={openSavedChats}
            onClose={() => setOpenSavedChats(false)}
            variant="persistent"
            sx={{
              '& .MuiDrawer-paper': {
                width: 250,
                boxSizing: 'border-box',
              },
            }}
          >
            <Box sx={{ width: 250, p: 2, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Saved Chats
                </Typography>
                <IconButton onClick={() => setOpenSavedChats(false)}>
                  <SidebarClose size={20} style={{ color: selectedIconColor }} />
                </IconButton>
              </Box>
              <List>
                {savedChats.map((chat, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <>
                        <IconButton edge="end" aria-label="more" onClick={(e) => handleOpenMenu(e, index)}>
                          <MoreVertical size={20} style={{ color: selectedIconColor }} />
                        </IconButton>
                        <Menu
                          anchorEl={menuAnchorEl}
                          open={Boolean(menuAnchorEl) && menuChatIndex === index}
                          onClose={handleCloseMenu}
                        >
                          <MenuItem onClick={() => handleDeleteChat(index)}>
                            <Delete size={20} style={{ color: selectedIconColor }} />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              Delete
                            </Typography>
                          </MenuItem>
                          <MenuItem onClick={() => handleRenameChat(index, prompt('New chat name:', chat.name))}>
                            <Edit size={20} style={{ color: selectedIconColor }} />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              Rename
                            </Typography>
                          </MenuItem>
                          <MenuItem onClick={() => handleShareChat(index)}>
                            <Share2 size={20} style={{ color: selectedIconColor }} />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              Share
                            </Typography>
                          </MenuItem>
                        </Menu>
                      </>
                    }
                  >
                    <ListItemButton onClick={() => handleLoadChat(index)}>
                      <ListItemText primary={chat.name} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'margin-left 0.3s, margin-right 0.3s',
              marginLeft: openSavedChats ? '250px' : '0',
              marginRight: showSummary ? '300px' : '0',
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }} ref={chatContainerRef}>
              {file && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ mr: 2 }}>{file.name}</Typography>
                  {sheetNames.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={selectedSheet}
                        onChange={handleSheetChange}
                        displayEmpty
                        inputProps={{ 'aria-label': 'Select sheet' }}
                      >
                        <MenuItem value="" disabled>
                          Select Sheet
                        </MenuItem>
                        {sheetNames.map((name, index) => (
                          <MenuItem key={index} value={name}>{name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              )}
              {tableData && <Box sx={{ mb: 2 }}>{renderTable(tableData)}</Box>}
              {renderMessages()}
              {file && (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) && dbInfo && (
                <SQLStructureVisualization dbInfo={dbInfo} darkMode={darkMode} />
              )}

            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    ref={backgroundRef}
                    onClick={() => setOpenBackgroundPicker(!openBackgroundPicker)}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <Layout size={20} style={{ color: selectedIconColor }} />
                  </Button>
                  <Button
                    ref={colorRef}
                    onClick={() => setOpenColorPicker(!openColorPicker)}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <Palette size={20} style={{ color: selectedIconColor }} />
                  </Button>
                  <Tooltip title="Sidekick">
                    <IconButton onClick={() => setShowSummary(!showSummary)} size="small" color="primary">
                      <Atom size={20} style={{ color: selectedIconColor }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  multiline
                  maxRows={4}
                  sx={{
                    mr: 1,
                    borderRadius: '20px',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="file"
                            accept=".csv,.tsv,.txt,.xls,.xlsx,.sqlite,.db,.pdf,.doc,.docx,.rtf"
                            style={{ display: 'none' }}
                            id="file-upload"
                            onChange={handleFileUpload}
                            aria-label="Upload file"
                          />
                          <label htmlFor="file-upload">
                            <Tooltip title="Upload CSV">
                              <IconButton component="span" size="small" color="primary">
                                <Paperclip size={20} style={{ color: selectedIconColor }} />
                              </IconButton>
                            </Tooltip>
                          </label>
                          {file && <Typography variant="caption" sx={{ ml: 1 }}>{file.name}</Typography>}
                        </Box>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleSend}
                          color="primary"
                          sx={{
                            color: darkMode ? '#fff' : '#000',
                            backgroundColor: darkMode ? '#333' : '#ddd',
                            '&:hover': { backgroundColor: darkMode ? '#444' : '#ccc' },
                          }}
                        >
                          <Send size={20} />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: '20px',
                    },
                  }}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                  {renderSuggestedPrompts()}
                </Box>
              </Box>

              {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
              {customInstructions && (
                <Chip
                  label={`Custom Instructions: ${customInstructions.substring(0, 30)}${customInstructions.length > 30 ? '...' : ''}`}
                  onDelete={handleClearCustomInstructions}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </Box>
          <Drawer
            anchor="right"
            open={showSummary}
            onClose={() => setShowSummary(false)}
            variant="persistent"
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
                bgcolor: 'background.default',
                boxShadow: 3,
              },
            }}
          >
            <Box sx={{ width: '100%', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  Dataset Summary
                </Typography>
                <IconButton onClick={() => setShowSummary(false)} size="small" sx={{ color: selectedIconColor }}>
                  <X size={24} />
                </IconButton>
              </Box>

              {file && !edaCompleted ? (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                    Processing data...
                  </Typography>
                  <LinearProgress variant="determinate" value={edaProgress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              ) : edaCompleted && summary ? (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.08)',
                          borderRadius: 2,
                          transition: 'background-color 0.3s'
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="primary">
                          {summary.rows}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Rows
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(220, 0, 78, 0.08)',
                          borderRadius: 2,
                          transition: 'background-color 0.3s'
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="secondary">
                          {summary.columns}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Columns
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenDetailedStatsDialog(true)}
                    disabled={loadingDetailedStats}
                    fullWidth
                    sx={{
                      mb: 3,
                      py: 1.5,
                      borderRadius: 2,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                      },
                      transition: 'all 0.3s',
                    }}
                    startIcon={<BarChart2 size={24} />}
                  >
                    {loadingDetailedStats ? 'Loading...' : 'View Detailed Stats'}
                  </Button>
                  <Divider sx={{ my: 2 }} />
                  {summary.columnTypes && renderAccordion(
                    'Data Types',
                    <List dense disablePadding>
                      {Object.entries(summary.columnTypes).map(([col, dtype]) => (
                        <ListItem key={col} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={col}
                            secondary={dtype}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          <Chip label={dtype} size="small" variant="outlined" sx={{ ml: 1 }} />
                        </ListItem>
                      ))}
                    </List>,
                    'panel1'
                  )}
                  {summary.columnsWithMissingValues && renderAccordion(
                    'Missing Values',
                    <List dense disablePadding>
                      {summary.columnsWithMissingValues.map((col) => (
                        <ListItem key={col} sx={{ py: 0.5 }}>
                          <ListItemText primary={col} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>,
                    'panel2'
                  )}
                  {summary.numericColumns && renderAccordion(
                    'Numeric Columns',
                    <List dense disablePadding>
                      {summary.numericColumns.map((col) => (
                        <ListItem key={col} sx={{ py: 0.5 }}>
                          <ListItemText primary={col} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>,
                    'panel3'
                  )}
                  {summary.categoricalColumns && renderAccordion(
                    'Categorical Columns',
                    <List dense disablePadding>
                      {summary.categoricalColumns.map((col) => (
                        <ListItem key={col} sx={{ py: 0.5 }}>
                          <ListItemText primary={col} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>,
                    'panel4'
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <FileText size={48} style={{ color: '#9e9e9e', marginBottom: 16 }} />
                  <Typography variant="body1" color="text.secondary">
                    No dataset uploaded yet.
                  </Typography>
                </Box>
              )}
            </Box>
            <Dialog
              open={openDetailedStatsDialog}
              onClose={() => setOpenDetailedStatsDialog(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Detailed Statistics</DialogTitle>
              <DialogContent>
                {loadingDetailedStats ? <CircularProgress /> : (
                  <>
                    {renderDescribeStats(detailedStats.describe)}
                    {renderCorrelationMatrix(detailedStats.correlation)}
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDetailedStatsDialog(false)} color="primary">
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Drawer>
        </Box>
        {showScrollToBottom && (
          <Fab
            color="primary"
            onClick={handleScrollToBottom}
            size="small"
            sx={{
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 30,
              height: 30,
              minHeight: 'unset',
              padding: 0,
            }}
          >
            <ArrowDown size={18} />
          </Fab>

        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={openHelpDialog} onClose={() => setOpenHelpDialog(false)}>
        <DialogTitle>Help</DialogTitle>
        <DialogContent>
          <Typography>Here you can add helpful information or instructions about how to use the app.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHelpDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(openSettingsMenu)}
        onClose={() => setOpenSettingsMenu(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            py: 3,
            px: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="h5" fontWeight="bold">Settings</Typography>
          <IconButton onClick={() => setOpenSettingsMenu(null)} size="large">
            <X size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', height: 600 }}>
          <List
            sx={{
              width: 260,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              py: 2,
              overflowY: 'auto'
            }}
          >
            {[
              { tab: 'general', icon: <Settings />, label: 'General' },
              { tab: 'personalization', icon: <UserPlus />, label: 'Personalization' },
              { tab: 'connectedApps', icon: <Plug />, label: 'Connected Apps' },
            ].map(({ tab, icon, label }) => (
              <ListItem
                key={tab}
                disablePadding
                sx={{ mb: 1 }}
              >
                <ListItemButton
                  selected={settingsTab === tab}
                  onClick={() => setSettingsTab(tab)}
                  sx={{
                    borderRadius: '0 50px 50px 0',
                    mr: 2,
                    transition: 'all 0.2s',
                    '&.Mui-selected': {
                      backgroundColor: (theme) => `${theme.palette.primary.main}20`,
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: (theme) => `${theme.palette.primary.main}30`,
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {React.cloneElement(icon, { size: 24 })}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontWeight: settingsTab === tab ? 'medium' : 'normal',
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ flexGrow: 1, p: 4, overflowY: 'auto' }}>
            {settingsTab === 'general' && (
              <>
                <Typography variant="h6" fontWeight="bold" gutterBottom>General Settings</Typography>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Palette size={20} style={{ marginRight: '8px' }} />
                    Icon Colors
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {iconColors.map((color) => (
                      <Tooltip key={color} title={color}>
                        <IconButton
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: color,
                            '&:hover': { bgcolor: color },
                          }}
                          onClick={() => handleIconColorChange(color)}
                        >
                          <Palette size={16} color="#ffffff" />
                        </IconButton>
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Brush size={20} style={{ marginRight: '8px' }} />
                    Theme
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant={darkMode ? 'outlined' : 'contained'}
                      onClick={() => handleThemeChange('light')}
                      startIcon={<Sun size={20} />}
                      sx={{
                        borderRadius: '12px',
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 'medium',
                      }}
                    >
                      Light
                    </Button>
                    <Button
                      variant={darkMode ? 'contained' : 'outlined'}
                      onClick={() => handleThemeChange('dark')}
                      startIcon={<Moon size={20} />}
                      sx={{
                        borderRadius: '12px',
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 'medium',
                      }}
                    >
                      Dark
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Brush size={20} style={{ marginRight: '8px' }} />
                    Custom Palettes
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[...seaPalettes, ...rosePalettes, ...forestPalettes].map((palette) => (
                      <Button
                        key={palette.name}
                        variant={selectedPalette?.name === palette.name ? 'contained' : 'outlined'}
                        onClick={() => setSelectedPalette(palette)}
                        startIcon={<Palette size={20} />}
                        sx={{
                          borderRadius: '12px',
                          px: 3,
                          py: 1,
                          textTransform: 'none',
                          fontWeight: 'medium',
                          backgroundColor: selectedPalette?.name === palette.name ? palette.colors[0] : 'transparent',
                          color: selectedPalette?.name === palette.name ? '#fff' : '#000',
                        }}
                      >
                        {palette.name}
                      </Button>
                    ))}
                  </Box>
                </Box>
              </>
            )}
            {settingsTab === 'personalization' && (
              <>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Personalization</Typography>
                <Box sx={{ mb: 4 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customInstructionsEnabled}
                        onChange={(e) => setCustomInstructionsEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="subtitle1" fontWeight="medium">
                        Enable Custom Instructions
                      </Typography>
                    }
                  />
                </Box>
                {customInstructionsEnabled && (
                  <>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <UserPlus size={20} style={{ marginRight: '8px' }} />
                        What would you like AI to know about you?
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={4}
                        value={tempCustomInstructions}
                        onChange={(e) => setTempCustomInstructions(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <MessageCircle size={20} style={{ marginRight: '8px' }} />
                        How would you like the AI to respond?
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={2}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        onClick={handleSaveCustomInstructions}
                        variant="contained"
                        color="primary"
                        startIcon={<Save size={20} />}
                        sx={{
                          borderRadius: '12px',
                          px: 3,
                          py: 1,
                          textTransform: 'none',
                          fontWeight: 'medium'
                        }}
                      >
                        Save Instructions
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}
            {settingsTab === 'connectedApps' && (
              <>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Connected Apps</Typography>
                <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
                  This feature is coming soon. Stay tuned for updates!
                </Alert>
                {['Google Drive', 'Google Sheets'].map((app, index) => (
                  <Box key={app} sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {index === 0 ? <Cloud size={24} style={{ marginRight: '12px' }} /> : <File size={24} style={{ marginRight: '12px' }} />}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">{app}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Connect your {app} account to import {index === 0 ? 'files' : 'data'}.
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Plug size={20} />}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 'medium'
                      }}
                      disabled
                    >
                      Connect
                    </Button>
                  </Box>
                ))}
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog open={openSaveChatDialog} onClose={() => setOpenSaveChatDialog(false)}>
        <DialogTitle>Save Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Name"
            fullWidth
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSaveChatDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSaveChat} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Popper open={openBackgroundPicker} anchorEl={backgroundRef.current} placement="top-start">
        <ClickAwayListener onClickAway={() => setOpenBackgroundPicker(false)}>
          <Paper elevation={3} sx={{ p: 1, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {backgroundColors.map((color) => (
                <Tooltip key={color} title={color}>
                  <IconButton
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: color,
                      '&:hover': { bgcolor: color },
                    }}
                    onClick={() => handleBackgroundColorChange(color)}
                  >
                    <Palette size={16} color={color === '#ffffff' ? '#000000' : '#ffffff'} />
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>

      <Popper open={openColorPicker} anchorEl={colorRef.current} placement="top-start">
        <ClickAwayListener onClickAway={() => setOpenColorPicker(false)}>
          <Paper elevation={3} sx={{ p: 1, width: 200, borderRadius: 2 }}>
            <Box sx={{ mb: 1 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ bgcolor: selectedColor, '&:hover': { bgcolor: selectedColor }, color: '#ffffff', borderRadius: 4 }}
                endIcon={<ChevronLeft size={16} />}
              >
                Datasets
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {datasetColors.map((color) => (
                <Tooltip key={color} title={color}>
                  <IconButton
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: color,
                      '&:hover': { bgcolor: color },
                    }}
                    onClick={() => handleColorChange(color)}
                  >
                    <Palette size={16} color="#ffffff" />
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
            <form onSubmit={handleCustomColorSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Custom Color (hex)"
                value={customColor}
                onChange={handleCustomColorChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">#</InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
              />
            </form>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </ThemeProvider>
  );
};

export default App;
