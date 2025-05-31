import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      // Convert mathematical content to proper LaTeX
      let processedContent = content
        // Convert Greek letters
        .replace(/λ/g, '$\\lambda$')
        .replace(/α/g, '$\\alpha$')
        .replace(/β/g, '$\\beta$')
        .replace(/γ/g, '$\\gamma$')
        .replace(/δ/g, '$\\delta$')
        .replace(/π/g, '$\\pi$')
        .replace(/θ/g, '$\\theta$')
        .replace(/μ/g, '$\\mu$')
        .replace(/σ/g, '$\\sigma$')
        .replace(/φ/g, '$\\phi$')
        .replace(/ω/g, '$\\omega$')
        
        // Convert equations and mathematical expressions
        .replace(/([a-zA-Z]+)\s*=\s*([^,\n.]+)/g, '$$$1 = $2$$')
        .replace(/([a-zA-Z])(\d)/g, '$$$1_$2$$')
        .replace(/\b([a-zA-Z])\^(\d+)/g, '$$$1^{$2}$$')
        .replace(/\b([a-zA-Z])_(\d+)/g, '$$$1_{$2}$$')
        
        // Convert limit expressions
        .replace(/lim\s*f\(([^)]+)\)\s*=\s*([^\n]+)/g, '$$\\lim f($1) = $2$$')
        
        // Convert matrix notation
        .replace(/\[([^\]]+)\]/g, '$[$1]$')
        
        // Basic formatting
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');

      containerRef.current.innerHTML = processedContent;
      
      // Force MathJax to render
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]);
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
