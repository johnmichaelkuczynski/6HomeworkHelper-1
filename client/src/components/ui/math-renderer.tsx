import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content && typeof content === 'string') {
      // Process content and auto-detect math expressions
      let processedContent = content
        // Convert common math notation to LaTeX
        .replace(/lim\(([^)]+)\)/g, '\\lim_{$1}')
        .replace(/([a-zA-Z]+)\(([^)]+)\)/g, '$1($2)')
        .replace(/([xy]²)/g, '$1^2')
        .replace(/([xy]³)/g, '$1^3')
        .replace(/([xy])²/g, '$1^2')
        .replace(/([xy])³/g, '$1^3')
        .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
        .replace(/∞/g, '\\infty')
        .replace(/≤/g, '\\leq')
        .replace(/≥/g, '\\geq')
        .replace(/→/g, '\\to')
        .replace(/∫/g, '\\int')
        .replace(/∑/g, '\\sum')
        .replace(/π/g, '\\pi')
        .replace(/α/g, '\\alpha')
        .replace(/β/g, '\\beta')
        .replace(/γ/g, '\\gamma')
        .replace(/δ/g, '\\delta')
        .replace(/θ/g, '\\theta')
        .replace(/λ/g, '\\lambda')
        .replace(/μ/g, '\\mu')
        .replace(/σ/g, '\\sigma')
        .replace(/φ/g, '\\phi')
        .replace(/ψ/g, '\\psi')
        .replace(/ω/g, '\\omega')
        // Auto-wrap mathematical expressions that look like they should be LaTeX
        .replace(/([a-zA-Z]+\([^)]*\)[^a-zA-Z]*=|=\s*[a-zA-Z]+\([^)]*\)|[a-zA-Z]\^[0-9]+|[a-zA-Z]_[0-9]+|\([a-zA-Z][²³⁴⁵⁶⁷⁸⁹⁰]*[-+][0-9]+\)|\([a-zA-Z][-+][0-9]+\)\([a-zA-Z][-+][0-9]+\))/g, (match) => {
          if (match.includes('$') || match.includes('\\')) return match;
          return `$${match}$`;
        })
        // Handle basic formatting
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      
      // Wrap in paragraph
      processedContent = `<p>${processedContent}</p>`;
      
      // Set content directly
      containerRef.current.innerHTML = processedContent;
      
      // Force MathJax rendering with multiple attempts
      let attempts = 0;
      const renderMath = () => {
        attempts++;
        if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
          window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
            console.error('MathJax error:', err);
            if (attempts < 5) {
              setTimeout(renderMath, 200);
            }
          });
        } else if (attempts < 10) {
          setTimeout(renderMath, 200);
        }
      };
      
      // Start rendering
      renderMath();
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
