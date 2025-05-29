import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax && content && typeof content === 'string') {
      // Process content to better handle markdown and math
      let processedContent = content
        // Convert markdown headers to HTML
        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-slate-900 mt-6 mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-4">$1</h1>')
        // Convert markdown bold to HTML
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
        // Convert line breaks to proper spacing
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/\n/g, '<br/>');
      
      // Wrap in paragraphs
      processedContent = `<p class="mb-4">${processedContent}</p>`;
      
      // Set the processed content
      containerRef.current.innerHTML = processedContent;
      
      // Typeset the math
      window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
        console.error('MathJax typeset error:', err);
      });
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
