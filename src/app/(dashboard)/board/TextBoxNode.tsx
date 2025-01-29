// TextBoxNode.tsx
import React, { useState } from 'react';
import { NodeProps } from 'reactflow';
import { X } from 'lucide-react';

const TextBoxNode: React.FC<NodeProps> = ({ data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content || ' ');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onContentChange) {
      data.onContentChange(data.id, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      setIsEditing(false);
      if (data.onContentChange) {
        data.onContentChange(data.id, text);
      }
    }
  };

  return (
    <div className="group relative min-w-[100px] min-h-[50px]">
      <button 
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full"
        onClick={() => data.onRemove(data.id)}
      >
        <X className="h-4 w-4" />
      </button>
      
      {isEditing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full min-h-[100px] p-2 bg-transparent border-none focus:outline-none resize-none"
          placeholder="Type your text here..."
        />
      ) : (
        <div 
          onClick={handleDoubleClick}
          className="p-2 whitespace-pre-wrap cursor-text"
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default TextBoxNode;