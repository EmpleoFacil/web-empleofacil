'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2 } from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  minHeightClassName?: string;
  placeholder?: string;
};

export function RichTextEditor({
  value,
  onChange,
  minHeightClassName = 'min-h-[180px]',
  placeholder = 'Escribe aqui...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const applyCommand = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt('Ingresa la URL (https://...)');
    if (!url) return;
    applyCommand('createLink', url);
  };

  return (
    <div className="rounded-lg border border-[#D1D9E6] bg-white">
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] p-2">
        <ToolbarButton label="Negrita" onClick={() => applyCommand('bold')}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Cursiva" onClick={() => applyCommand('italic')}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Subrayado" onClick={() => applyCommand('underline')}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-[#E2E8F0]" />
        <ToolbarButton label="Lista" onClick={() => applyCommand('insertUnorderedList')}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => applyCommand('insertOrderedList')}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Enlace" onClick={insertLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder}
        className={`w-full px-4 py-3 text-sm text-[#334155] focus:outline-none ${minHeightClassName} prose prose-sm max-w-none [&:empty:before]:text-[#94A3B8] [&:empty:before]:content-[attr(data-placeholder)]`}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-md p-2 text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
    >
      {children}
    </button>
  );
}
