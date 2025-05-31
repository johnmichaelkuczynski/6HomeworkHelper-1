import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content && typeof content === 'string') {
      // Process Markdown but preserve all LaTeX expressions completely intact
      let processedContent = content
        // First, protect LaTeX expressions by temporarily replacing them
        .replace(/\$\$[\s\S]*?\$\$/g, (match) => `MATHBLOCK_${btoa(match)}_MATHBLOCK`)
        .replace(/\$[^$\n]+\$/g, (match) => `MATHINLINE_${btoa(match)}_MATHINLINE`)
        .replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, (match) => `MATHENV_${btoa(match)}_MATHENV`)
        .replace(/\\[a-zA-Z]+(\{[^}]*\}|\[[^\]]*\])*(\{[^}]*\}|\[[^\]]*\])*/g, (match) => `MATHCMD_${btoa(match)}_MATHCMD`)
        // Process basic Markdown
        .replace(/### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
        .replace(/## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
        .replace(/# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        // Handle lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
        .replace(/^[-*]\s+(.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
        // Handle line breaks
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/\n/g, '<br/>')
        // Restore LaTeX expressions exactly as they were
        .replace(/MATHBLOCK_([^_]+)_MATHBLOCK/g, (_, encoded) => atob(encoded))
        .replace(/MATHINLINE_([^_]+)_MATHINLINE/g, (_, encoded) => atob(encoded))
        .replace(/MATHENV_([^_]+)_MATHENV/g, (_, encoded) => atob(encoded))
        .replace(/MATHCMD_([^_]+)_MATHCMD/g, (_, encoded) => atob(encoded));

      // Wrap in paragraph tags if needed
      if (!processedContent.includes('<h') && !processedContent.includes('<li') && !processedContent.includes('<div')) {
        processedContent = `<p class="mb-4">${processedContent}</p>`;
      }
      
      // Set the content directly
      containerRef.current.innerHTML = processedContent;
      
      // Render math with MathJax
      let attempts = 0;
      const maxAttempts = 15;
      
      const renderMath = () => {
        attempts++;
        if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
          window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
            console.error('MathJax error:', err);
            if (attempts < maxAttempts) {
              setTimeout(renderMath, 300);
            }
          });
        } else if (attempts < maxAttempts) {
          setTimeout(renderMath, 200);
        }
      };
      
      // Start rendering immediately and retry if needed
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
