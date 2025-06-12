import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      console.log('Math content to render:', content);
      
      // Set content directly with minimal processing
      let processedContent = content
        // Basic formatting only
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      // Wrap in paragraphs if not already wrapped
      if (!processedContent.startsWith('<p>')) {
        processedContent = '<p>' + processedContent + '</p>';
      }

      containerRef.current.innerHTML = processedContent;
      containerRef.current.classList.add('math-content');
      
      console.log('Processed HTML:', containerRef.current.innerHTML);
      
      // Force MathJax to render all mathematical content
      if (window.MathJax && window.MathJax.typesetPromise) {
        console.log('Triggering MathJax rendering...');
        window.MathJax.typesetPromise([containerRef.current])
          .then(() => {
            console.log('MathJax rendering completed');
          })
          .catch((error) => {
            console.error('MathJax rendering error:', error);
          });
      } else {
        console.error('MathJax not available');
      }
    }
  }, [content])

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
