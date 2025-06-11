import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      // Enhanced mathematical content processing
      let processedContent = content
        // Preserve existing LaTeX delimiters
        .replace(/\$\$([^$]+)\$\$/g, '$$$$$$$$DISPLAY_MATH_$1_END$$$$$$$$')
        .replace(/\$([^$]+)\$/g, '$$INLINE_MATH_$1_END$$')
        
        // Convert common mathematical symbols
        .replace(/∞/g, '$\\infty$')
        .replace(/∑/g, '$\\sum$')
        .replace(/∏/g, '$\\prod$')
        .replace(/∫/g, '$\\int$')
        .replace(/∂/g, '$\\partial$')
        .replace(/∇/g, '$\\nabla$')
        .replace(/√/g, '$\\sqrt{}$')
        .replace(/±/g, '$\\pm$')
        .replace(/≠/g, '$\\neq$')
        .replace(/≤/g, '$\\leq$')
        .replace(/≥/g, '$\\geq$')
        .replace(/≈/g, '$\\approx$')
        .replace(/∈/g, '$\\in$')
        .replace(/∉/g, '$\\notin$')
        .replace(/⊆/g, '$\\subseteq$')
        .replace(/⊊/g, '$\\subset$')
        .replace(/∪/g, '$\\cup$')
        .replace(/∩/g, '$\\cap$')
        .replace(/∅/g, '$\\emptyset$')
        .replace(/→/g, '$\\rightarrow$')
        .replace(/←/g, '$\\leftarrow$')
        .replace(/↔/g, '$\\leftrightarrow$')
        .replace(/⇒/g, '$\\Rightarrow$')
        .replace(/⇔/g, '$\\Leftrightarrow$')
        .replace(/∀/g, '$\\forall$')
        .replace(/∃/g, '$\\exists$')
        .replace(/∧/g, '$\\land$')
        .replace(/∨/g, '$\\lor$')
        .replace(/¬/g, '$\\neg$')
        
        // Greek letters
        .replace(/α/g, '$\\alpha$')
        .replace(/β/g, '$\\beta$')
        .replace(/γ/g, '$\\gamma$')
        .replace(/δ/g, '$\\delta$')
        .replace(/ε/g, '$\\epsilon$')
        .replace(/ζ/g, '$\\zeta$')
        .replace(/η/g, '$\\eta$')
        .replace(/θ/g, '$\\theta$')
        .replace(/ι/g, '$\\iota$')
        .replace(/κ/g, '$\\kappa$')
        .replace(/λ/g, '$\\lambda$')
        .replace(/μ/g, '$\\mu$')
        .replace(/ν/g, '$\\nu$')
        .replace(/ξ/g, '$\\xi$')
        .replace(/π/g, '$\\pi$')
        .replace(/ρ/g, '$\\rho$')
        .replace(/σ/g, '$\\sigma$')
        .replace(/τ/g, '$\\tau$')
        .replace(/υ/g, '$\\upsilon$')
        .replace(/φ/g, '$\\phi$')
        .replace(/χ/g, '$\\chi$')
        .replace(/ψ/g, '$\\psi$')
        .replace(/ω/g, '$\\omega$')
        
        // Capital Greek letters
        .replace(/Γ/g, '$\\Gamma$')
        .replace(/Δ/g, '$\\Delta$')
        .replace(/Θ/g, '$\\Theta$')
        .replace(/Λ/g, '$\\Lambda$')
        .replace(/Ξ/g, '$\\Xi$')
        .replace(/Π/g, '$\\Pi$')
        .replace(/Σ/g, '$\\Sigma$')
        .replace(/Φ/g, '$\\Phi$')
        .replace(/Ψ/g, '$\\Psi$')
        .replace(/Ω/g, '$\\Omega$')
        
        // Convert common mathematical patterns
        .replace(/\b([a-zA-Z])\^(\d+)/g, '$$$1^{$2}$$')
        .replace(/\b([a-zA-Z])_(\d+)/g, '$$$1_{$2}$$')
        .replace(/\b([a-zA-Z])\^([a-zA-Z])/g, '$$$1^{$2}$$')
        .replace(/\b([a-zA-Z])_([a-zA-Z])/g, '$$$1_{$2}$$')
        
        // Convert fractions
        .replace(/(\d+)\/(\d+)/g, '$$\\frac{$1}{$2}$$')
        .replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '$$\\frac{$1}{$2}$$')
        
        // Convert sqrt expressions
        .replace(/sqrt\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
        .replace(/\√\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
        
        // Convert limit expressions
        .replace(/lim\s+([a-zA-Z]+)\s*→\s*([^\s]+)\s+([^\n]+)/g, '$$\\lim_{$1 \\to $2} $3$$')
        .replace(/lim\s+([a-zA-Z]+)\s*->\s*([^\s]+)\s+([^\n]+)/g, '$$\\lim_{$1 \\to $2} $3$$')
        
        // Convert integral expressions
        .replace(/∫([^d]+)d([a-zA-Z])/g, '$$\\int $1 \\, d$2$$')
        .replace(/∫_([^∫]+)\^([^∫]+)([^d]+)d([a-zA-Z])/g, '$$\\int_{$1}^{$2} $3 \\, d$4$$')
        
        // Convert summation expressions
        .replace(/∑_([^∑]+)\^([^∑]+)([^\n]+)/g, '$$\\sum_{$1}^{$2} $3$$')
        .replace(/sum_([^sum]+)\^([^sum]+)([^\n]+)/g, '$$\\sum_{$1}^{$2} $3$$')
        
        // Restore preserved LaTeX
        .replace(/\$\$\$\$\$\$\$\$DISPLAY_MATH_([^_]+)_END\$\$\$\$\$\$\$\$/g, '$$$$$$1$$$$')
        .replace(/\$\$INLINE_MATH_([^_]+)_END\$\$/g, '$$$1$$')
        
        // Basic formatting
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      // Wrap in paragraphs
      if (!processedContent.includes('<p>')) {
        processedContent = '<p>' + processedContent + '</p>';
      }

      containerRef.current.innerHTML = processedContent;
      containerRef.current.classList.add('math-content');
      
      // Force MathJax to render
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]).catch(console.error);
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
