import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content && typeof content === 'string') {
      // Raw passthrough - display exactly what the LLM provided
      let processedContent = content
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Set the raw content
      containerRef.current.innerHTML = processedContent;
      
      // Render math if MathJax is available - with retry mechanism
      const renderMath = () => {
        if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
          window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
            console.error('MathJax typeset error:', err);
          });
        } else {
          // Retry after a short delay if MathJax isn't ready yet
          setTimeout(renderMath, 100);
        }
      };
      
      // Start math rendering after content is set
      setTimeout(renderMath, 50);
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
