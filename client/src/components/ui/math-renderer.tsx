import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      // Test: Add simple math that should definitely work
      let processedContent = content + '\n\nTest math: $x^2 + y^2 = z^2$ and $$\\lim_{x \\to \\infty} f(x) = L$$';
      
      // Basic formatting only
      processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');

      containerRef.current.innerHTML = processedContent;
      
      // Debug MathJax
      console.log('MathJax available:', !!window.MathJax);
      console.log('MathJax typesetPromise:', !!window.MathJax?.typesetPromise);
      
      // Force MathJax to render
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current])
          .then(() => console.log('MathJax render success'))
          .catch(err => console.error('MathJax render error:', err));
      }
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`${className}`}
      style={{ fontSize: '16px', lineHeight: '1.6' }}
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
