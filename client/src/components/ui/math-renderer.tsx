import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax) {
      // Set the content
      containerRef.current.innerHTML = content;
      
      // Typeset the math
      window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
        console.error('MathJax typeset error:', err);
      });
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`math-content prose prose-slate max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
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
