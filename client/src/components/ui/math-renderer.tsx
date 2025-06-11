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
        
        // Convert exponents - more comprehensive patterns
        .replace(/([a-zA-Z0-9()]+)\^(\{[^}]+\})/g, '$$$1^$2$$')  // x^{2+3}
        .replace(/([a-zA-Z0-9()]+)\^([a-zA-Z0-9+\-*/()]+)/g, '$$$1^{$2}$$')  // x^2, x^(n+1)
        .replace(/([a-zA-Z0-9()]+)_(\{[^}]+\})/g, '$$$1_$2$$')  // x_{i+1}
        .replace(/([a-zA-Z0-9()]+)_([a-zA-Z0-9+\-*/()]+)/g, '$$$1_{$2}$$')  // x_i, x_(n+1)
        
        // Convert standalone exponents and subscripts in text
        .replace(/\b([a-zA-Z]+)(\d+)\b/g, '$$$1_{$2}$$')  // x2 -> x_2
        .replace(/\b([a-zA-Z])\s*\^\s*(\d+)/g, '$$$1^{$2}$$')  // x ^ 2 -> x^2
        .replace(/\b([a-zA-Z])\s*\^\s*([a-zA-Z])/g, '$$$1^{$2}$$')  // x ^ n -> x^n
        .replace(/\^([+-]?\d+)/g, '^{$1}')
        .replace(/_([+-]?\d+)/g, '_{$1}')
        
        // Convert common exponent expressions
        .replace(/\b2\^(\d+)/g, '$$2^{$1}$$')  // 2^8
        .replace(/\b10\^([+-]?\d+)/g, '$$10^{$1}$$')  // 10^-3
        .replace(/\be\^([a-zA-Z0-9+\-*/()]+)/g, '$$e^{$1}$$')  // e^x
        
        // Convert fractions - more patterns
        .replace(/(\d+)\/(\d+)/g, '$$\\frac{$1}{$2}$$')
        .replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '$$\\frac{$1}{$2}$$')
        .replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, '$$\\frac{$1}{$2}$$')
        .replace(/\bfrac\{([^}]+)\}\{([^}]+)\}/g, '$$\\frac{$1}{$2}$$')
        
        // Convert sqrt expressions
        .replace(/sqrt\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
        .replace(/\√\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
        .replace(/\\sqrt\{([^}]+)\}/g, '$$\\sqrt{$1}$$')
        
        // Convert exponential and logarithmic functions
        .replace(/\be\^([a-zA-Z0-9+\-*/()]+)/g, '$$e^{$1}$$')
        .replace(/\bexp\(([^)]+)\)/g, '$$e^{$1}$$')
        .replace(/\bln\(([^)]+)\)/g, '$$\\ln($1)$$')
        .replace(/\blog\(([^)]+)\)/g, '$$\\log($1)$$')
        .replace(/\blog_(\d+)\(([^)]+)\)/g, '$$\\log_{$1}($2)$$')
        
        // Convert trigonometric functions
        .replace(/\bsin\(([^)]+)\)/g, '$$\\sin($1)$$')
        .replace(/\bcos\(([^)]+)\)/g, '$$\\cos($1)$$')
        .replace(/\btan\(([^)]+)\)/g, '$$\\tan($1)$$')
        .replace(/\bsec\(([^)]+)\)/g, '$$\\sec($1)$$')
        .replace(/\bcsc\(([^)]+)\)/g, '$$\\csc($1)$$')
        .replace(/\bcot\(([^)]+)\)/g, '$$\\cot($1)$$')
        .replace(/\barcsin\(([^)]+)\)/g, '$$\\arcsin($1)$$')
        .replace(/\barccos\(([^)]+)\)/g, '$$\\arccos($1)$$')
        .replace(/\barctan\(([^)]+)\)/g, '$$\\arctan($1)$$')
        
        // Convert limit expressions
        .replace(/lim\s+([a-zA-Z]+)\s*→\s*([^\s]+)\s+([^\n]+)/g, '$$\\lim_{$1 \\to $2} $3$$')
        .replace(/lim\s+([a-zA-Z]+)\s*->\s*([^\s]+)\s+([^\n]+)/g, '$$\\lim_{$1 \\to $2} $3$$')
        .replace(/\\lim_\{([^}]+)\}/g, '$$\\lim_{$1}$$')
        
        // Convert integral expressions
        .replace(/∫([^d]+)d([a-zA-Z])/g, '$$\\int $1 \\, d$2$$')
        .replace(/∫_([^∫]+)\^([^∫]+)([^d]+)d([a-zA-Z])/g, '$$\\int_{$1}^{$2} $3 \\, d$4$$')
        .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '$$\\int_{$1}^{$2}$$')
        
        // Convert summation expressions
        .replace(/∑_([^∑]+)\^([^∑]+)([^\n]+)/g, '$$\\sum_{$1}^{$2} $3$$')
        .replace(/sum_([^sum]+)\^([^sum]+)([^\n]+)/g, '$$\\sum_{$1}^{$2} $3$$')
        .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '$$\\sum_{$1}^{$2}$$')
        
        // Convert product expressions
        .replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '$$\\prod_{$1}^{$2}$$')
        
        // Convert matrix expressions
        .replace(/\\begin\{matrix\}([^}]+)\\end\{matrix\}/g, '$$\\begin{matrix}$1\\end{matrix}$$')
        .replace(/\\begin\{pmatrix\}([^}]+)\\end\{pmatrix\}/g, '$$\\begin{pmatrix}$1\\end{pmatrix}$$')
        .replace(/\\begin\{bmatrix\}([^}]+)\\end\{bmatrix\}/g, '$$\\begin{bmatrix}$1\\end{bmatrix}$$')
        
        // Convert equations and expressions - more comprehensive
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*=\s*([^,\n.;|]+)/g, '$$$1 = $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*≠\s*([^,\n.;|]+)/g, '$$$1 \\neq $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*≈\s*([^,\n.;|]+)/g, '$$$1 \\approx $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*≤\s*([^,\n.;|]+)/g, '$$$1 \\leq $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*≥\s*([^,\n.;|]+)/g, '$$$1 \\geq $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*<\s*([^,\n.;|]+)/g, '$$$1 < $2$$')
        .replace(/([a-zA-Z0-9()^_{}+\-*/\\\s]+)\s*>\s*([^,\n.;|]+)/g, '$$$1 > $2$$')
        
        // Convert mathematical operations in expressions
        .replace(/([a-zA-Z0-9)]+)\s*\+\s*([a-zA-Z0-9(]+)/g, '$$$1 + $2$$')
        .replace(/([a-zA-Z0-9)]+)\s*-\s*([a-zA-Z0-9(]+)/g, '$$$1 - $2$$')
        .replace(/([a-zA-Z0-9)]+)\s*\*\s*([a-zA-Z0-9(]+)/g, '$$$1 \\cdot $2$$')
        .replace(/([a-zA-Z0-9)]+)\s*\times\s*([a-zA-Z0-9(]+)/g, '$$$1 \\times $2$$')
        .replace(/([a-zA-Z0-9)]+)\s*÷\s*([a-zA-Z0-9(]+)/g, '$$$1 \\div $2$$')
        
        // Convert derivatives
        .replace(/d\/dx\s*\(([^)]+)\)/g, '$$\\frac{d}{dx}($1)$$')
        .replace(/d\/d([a-zA-Z])\s*\(([^)]+)\)/g, '$$\\frac{d}{d$1}($2)$$')
        .replace(/∂\/∂([a-zA-Z])\s*\(([^)]+)\)/g, '$$\\frac{\\partial}{\\partial $1}($2)$$')
        
        // Handle complex mathematical expressions
        .replace(/\b([a-zA-Z]+)\(([^)]+)\)\^([a-zA-Z0-9]+)/g, '$$$1($2)^{$3}$$')  // f(x)^2
        .replace(/\b([a-zA-Z]+)\(([^)]+)\)_([a-zA-Z0-9]+)/g, '$$$1($2)_{$3}$$')  // f(x)_n
        
        // Handle common mathematical constants and functions
        .replace(/\binfty\b/g, '$\\infty$')
        .replace(/\bInfinity\b/g, '$\\infty$')
        .replace(/\bempty\s+set\b/g, '$\\emptyset$')
        .replace(/\breal\s+numbers\b/g, '$\\mathbb{R}$')
        .replace(/\bnatural\s+numbers\b/g, '$\\mathbb{N}$')
        .replace(/\bintegers\b/g, '$\\mathbb{Z}$')
        .replace(/\brational\s+numbers\b/g, '$\\mathbb{Q}$')
        .replace(/\bcomplex\s+numbers\b/g, '$\\mathbb{C}$')
        
        // Handle degree symbol
        .replace(/(\d+)\s*degrees?/g, '$$$1°$$')
        .replace(/(\d+)°/g, '$$$1^\\circ$$')
        
        // Handle percentage
        .replace(/(\d+)%/g, '$$$1\\%$$')
        
        // Handle intervals
        .replace(/\[([^,]+),\s*([^\]]+)\]/g, '$$[$1, $2]$$')
        .replace(/\(([^,]+),\s*([^)]+)\)/g, '$$($1, $2)$$')
        
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
