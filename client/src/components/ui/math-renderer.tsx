import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax && content && typeof content === 'string') {
      // Process content to preserve line breaks and formatting
      let processedContent = content
        // Split by double line breaks to create paragraphs
        .split('\n\n')
        .map(paragraph => {
          if (paragraph.trim().length === 0) return '';
          
          // Process single paragraph
          let para = paragraph
            // Convert single line breaks to <br> within paragraphs
            .replace(/\n/g, '<br/>')
            // Handle any remaining markdown bold
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
          
          return `<div class="mb-4 leading-relaxed">${para}</div>`;
        })
        .filter(p => p.length > 0)
        .join('');
      
      // If no content, return empty
      if (!processedContent.trim()) {
        processedContent = '<div class="text-slate-500 italic">No content to display</div>';
      }
      
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
