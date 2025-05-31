import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content && typeof content === 'string') {
      // Simple processing - just basic formatting, leave ALL math untouched
      let processedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      
      // Wrap in paragraph
      processedContent = `<p>${processedContent}</p>`;
      
      // Set content directly
      containerRef.current.innerHTML = processedContent;
      
      // Force MathJax rendering
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]).catch(console.error);
      } else {
        // Wait for MathJax to load
        setTimeout(() => {
          if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
            window.MathJax.typesetPromise([containerRef.current]).catch(console.error);
          }
        }, 500);
      }
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
