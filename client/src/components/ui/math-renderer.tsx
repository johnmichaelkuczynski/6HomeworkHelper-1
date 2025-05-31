import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content && typeof content === 'string') {
      // Enhanced Markdown processing for better formatting
      let processedContent = content
        // Preserve LaTeX math expressions first
        .replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$$$$1$$</div>')
        .replace(/\$([^$]+)\$/g, '<span class="math-inline">$$1$</span>')
        .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{[^}]+\}/g, '<div class="math-display">\\begin{$1}$2\\end{$1}</div>')
        .replace(/\\\\([^\\]+)\\\\/g, '<span class="math-inline">\\\\$1\\\\</span>')
        // Process Markdown formatting
        .replace(/### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
        .replace(/## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
        .replace(/# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        // Handle lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
        .replace(/^[-*]\s+(.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
        // Convert line breaks to proper HTML
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/\n/g, '<br/>');

      // Wrap in paragraph tags if not already structured
      if (!processedContent.includes('<h') && !processedContent.includes('<li') && !processedContent.includes('<div')) {
        processedContent = `<p class="mb-4">${processedContent}</p>`;
      }
      
      // Set the processed content
      containerRef.current.innerHTML = processedContent;
      
      // Enhanced MathJax rendering with multiple attempts
      let attempts = 0;
      const maxAttempts = 10;
      
      const renderMath = () => {
        attempts++;
        if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
          // Configure MathJax for better rendering
          if (window.MathJax.tex) {
            window.MathJax.tex.inlineMath = [['$', '$'], ['\\(', '\\)']];
            window.MathJax.tex.displayMath = [['$$', '$$'], ['\\[', '\\]']];
            window.MathJax.tex.processEscapes = true;
          }
          
          window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
            console.error('MathJax typeset error:', err);
            if (attempts < maxAttempts) {
              setTimeout(renderMath, 200);
            }
          });
        } else if (attempts < maxAttempts) {
          // Retry with exponential backoff
          setTimeout(renderMath, Math.min(100 * attempts, 1000));
        }
      };
      
      // Start math rendering after a short delay to ensure DOM is ready
      setTimeout(renderMath, 100);
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`math-content prose prose-slate max-w-none text-slate-800 leading-relaxed ${className}`}
      style={{
        fontSize: '16px',
        lineHeight: '1.6'
      }}
    />
  );
}

// Declare MathJax types for TypeScript
declare global {
  interface Window {
    MathJax: {
      typesetPromise: (elements?: Element[]) => Promise<void>;
      tex: {
        inlineMath: string[][];
        displayMath: string[][];
        processEscapes: boolean;
      };
      options: {
        processHtmlClass: string;
      };
    };
  }
}
