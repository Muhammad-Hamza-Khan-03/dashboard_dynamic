import { Node, NodeProps, XYPosition } from '@xyflow/react';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface TextBoxNodeData extends Record<string, unknown> {
  content: string;
  onContentChange: (id: string, content: string) => void;
  onRemove: (id: string) => void;
}

// Create a type for the complete node by extending the Node type.
// Here, we assume the node’s id is a string.
interface TextBoxNodeType extends Node<TextBoxNodeData, string> {
  position: XYPosition; // Ensure the position property is present
}

const TextBoxNode: React.FC<NodeProps<TextBoxNodeType>> = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content || '');

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    data.onContentChange(id, text);
  }, [id, data, text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  return (
    <div className={`group relative min-w-[100px] min-h-[50px] bg-white dark:bg-slate-800 p-2 rounded-md shadow-md border ${
      selected ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'
    }`}>
      <button
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 transition-opacity duration-200"
        onClick={handleRemove}
        type="button"
      >
        <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </button>

      {isEditing ? (
        <textarea
          autoFocus
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full min-h-[100px] p-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded resize-none text-slate-800 dark:text-slate-200"
          placeholder="Type your text here..."
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          className="p-2 whitespace-pre-wrap cursor-text text-slate-800 dark:text-slate-200 min-h-[100px]"
        >
          {text || 'Click to edit text'}
        </div>
      )}
    </div>
  );
};

export default TextBoxNode;
