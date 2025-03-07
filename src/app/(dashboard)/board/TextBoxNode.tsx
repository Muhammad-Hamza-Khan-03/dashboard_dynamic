import { Node, NodeProps, NodeResizer, XYPosition } from '@xyflow/react';
import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-provider';
import { D3DragEvent, SubjectPosition } from 'd3';

interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}
interface TextBoxNodeData extends Record<string, unknown> {
  id:string;
  content: string;
  position: Position;
  onContentChange: (id: string, content: string) => void;
  onRemove: (id: string) => void;
  onPositionChange?: (id: string, position: Position) => void;
}

interface TextBoxNodeType extends Node<TextBoxNodeData, string> {
  id: string;
  position: XYPosition; // Ensure the position property is present
  data: TextBoxNodeData;
  selected?: boolean;
}

const TextBoxNode: React.FC<NodeProps<TextBoxNodeType>> = ({ id, data, selected }) => {
  const { boardTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content || '');
  // const [text, setText] = useState(data.content || '');
  const [isResizing, setIsResizing] = useState(false);
  const [nodeWidth, setNodeWidth] = useState(data.position?.width || 250);
  const [nodeHeight, setNodeHeight] = useState(data.position?.height || 150);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
   // Set initial size based on content
   useEffect(() => {
    if (data.position?.width) {
      setNodeWidth(data.position.width);
    }
    if (data.position?.height) {
      setNodeHeight(data.position.height);
    }
  }, [data.position]);

  // Update content from props
  useEffect(() => {
    setText(data.content || '');
  }, [data.content]);

  // Auto-focus when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end of the text
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);
  
  
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);


  const handleBlur = useCallback(() => {
    setIsEditing(false);
    data.onContentChange(id, text);
  }, [id, data, text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        data.onContentChange(id, text);
      }
      // Allow Enter to create new lines when Shift is pressed
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setIsEditing(false);
        data.onContentChange(id, text);
      }
    },
    [id, data, text]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handleRemove = useCallback(() => {
    data.onRemove(id);
  }, [id, data]);

  // Handle resize events
  const onResize = useCallback((event: any, params: { width: number, height: number }) => {
    setNodeWidth(params.width);
    setNodeHeight(params.height);
    setIsResizing(true);
  }, []);

  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback((event: D3DragEvent<HTMLDivElement, null, SubjectPosition>, params: { width: number, height: number }) => {
    const updatedPosition = {
      ...data.position,
      width: params.width,
      height: params.height
    };
    
    // Update position in parent component if handler exists
    if (data.onPositionChange) {
      data.onPositionChange(id, updatedPosition);
    }
    
    setIsResizing(false);
  }, [data, id]);

  return (
    <>
    {/* Standard NodeResizer that only appears when selected */}
    {selected && (
      <NodeResizer
        minWidth={150}
        minHeight={100}
        maxWidth={1000}
        maxHeight={800}
        onResize={onResize}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
        color={boardTheme.primary}
        handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
        lineStyle={{ borderWidth: 1 }}
      />
    )}
    
    <div 
      className={`relative p-2 rounded-lg shadow-md transition-colors duration-200 ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : 'ring-1 ring-gray-200 dark:ring-gray-700'}`}
      style={{
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        backgroundColor: boardTheme.nodeBackground,
        color: boardTheme.text,
        borderColor: boardTheme.border,
        overflow: 'hidden'
      }}
    >
      <button
        className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-600 transition-opacity duration-200 opacity-0 group-hover:opacity-100 hover:opacity-100 z-10"
        onClick={handleRemove}
        type="button"
      >
        <X className="h-3 w-3 text-slate-500 dark:text-slate-400" />
      </button>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded resize-none text-slate-800 dark:text-slate-200"
          placeholder="Type your text here..."
          style={{
            color: boardTheme.text,
            backgroundColor: 'transparent'
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          className="w-full h-full p-2 whitespace-pre-wrap cursor-text overflow-auto"
          style={{
            color: boardTheme.text
          }}
        >
          {text || 'Double-click to edit text'}
        </div>
      )}
    </div>
  </>
  );
};

export default memo(TextBoxNode);
