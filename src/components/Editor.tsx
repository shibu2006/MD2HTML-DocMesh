import type { MarkdownFile } from '../types';

interface EditorProps {
  activeFile: MarkdownFile | undefined;
  onContentChange: (fileId: string, content: string) => void;
}

export function Editor({ activeFile, onContentChange }: EditorProps) {
  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <p>No file selected</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(activeFile.id, e.target.value);
  };

  return (
    <div className="h-full">
      <textarea
        value={activeFile.content}
        onChange={handleChange}
        className="w-full h-full p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm resize-none focus:outline-none border-none transition-colors duration-300"
        placeholder="Start typing your Markdown here..."
        aria-label="Markdown editor"
      />
    </div>
  );
}
