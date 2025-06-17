import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

interface GraphData {
  type: 'line' | 'bar' | 'scatter';
  title: string;
  xLabel: string;
  yLabel: string;
  data: { x: number; y: number; label?: string }[];
}

function createSVGChart(graphData: GraphData, width: number = 600, height: number = 400): string {
  const margin = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const xValues = graphData.data.map(d => d.x);
  const yValues = graphData.data.map(d => d.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  // Add padding to scales
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xPadding = xRange * 0.1;
  const yPadding = yRange * 0.1;

  const xScale = (x: number) => ((x - (xMin - xPadding)) / (xRange + 2 * xPadding)) * chartWidth;
  const yScale = (y: number) => chartHeight - ((y - (yMin - yPadding)) / (yRange + 2 * yPadding)) * chartHeight;

  // Generate tick marks
  const xTicks = 6;
  const yTicks = 6;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => 
    (xMin - xPadding) + ((xRange + 2 * xPadding) / (xTicks - 1)) * i
  );
  const yTickValues = Array.from({ length: yTicks }, (_, i) => 
    (yMin - yPadding) + ((yRange + 2 * yPadding) / (yTicks - 1)) * i
  );

  let chartElements = '';

  if (graphData.type === 'line') {
    // Create line path
    const pathData = graphData.data.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${margin.left + xScale(d.x)} ${margin.top + yScale(d.y)}`
    ).join(' ');
    
    chartElements = `
      <path d="${pathData}" stroke="#3b82f6" stroke-width="2" fill="none"/>
      ${graphData.data.map(d => 
        `<circle cx="${margin.left + xScale(d.x)}" cy="${margin.top + yScale(d.y)}" r="4" fill="#1d4ed8"/>`
      ).join('')}
    `;
  } else if (graphData.type === 'bar') {
    const barWidth = chartWidth / graphData.data.length * 0.6;
    chartElements = graphData.data.map((d, i) => {
      const barHeight = Math.abs(yScale(d.y) - yScale(yMin - yPadding));
      const x = margin.left + (i + 0.5) * (chartWidth / graphData.data.length) - barWidth / 2;
      const y = margin.top + Math.min(yScale(d.y), yScale(yMin - yPadding));
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#3b82f6"/>`;
    }).join('');
  } else if (graphData.type === 'scatter') {
    chartElements = graphData.data.map(d => 
      `<circle cx="${margin.left + xScale(d.x)}" cy="${margin.top + yScale(d.y)}" r="5" fill="#3b82f6"/>`
    ).join('');
  }

  return `
    <svg width="${width}" height="${height}" style="border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e293b">
        ${graphData.title}
      </text>
      
      <!-- Chart area background -->
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" 
            fill="#fafafa" stroke="#e2e8f0"/>
      
      <!-- Grid lines -->
      ${xTickValues.map(tick => 
        `<line x1="${margin.left + xScale(tick)}" y1="${margin.top}" 
               x2="${margin.left + xScale(tick)}" y2="${margin.top + chartHeight}" 
               stroke="#e2e8f0" stroke-width="1"/>`
      ).join('')}
      ${yTickValues.map(tick => 
        `<line x1="${margin.left}" y1="${margin.top + yScale(tick)}" 
               x2="${margin.left + chartWidth}" y2="${margin.top + yScale(tick)}" 
               stroke="#e2e8f0" stroke-width="1"/>`
      ).join('')}
      
      <!-- Axes -->
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" 
            x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" 
            stroke="#374151" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}" 
            x2="${margin.left}" y2="${margin.top + chartHeight}" 
            stroke="#374151" stroke-width="2"/>
      
      <!-- X-axis ticks and labels -->
      ${xTickValues.map(tick => `
        <line x1="${margin.left + xScale(tick)}" y1="${margin.top + chartHeight}" 
              x2="${margin.left + xScale(tick)}" y2="${margin.top + chartHeight + 6}" 
              stroke="#374151" stroke-width="1"/>
        <text x="${margin.left + xScale(tick)}" y="${margin.top + chartHeight + 20}" 
              text-anchor="middle" font-size="12" fill="#374151">
          ${tick.toFixed(1)}
        </text>
      `).join('')}
      
      <!-- Y-axis ticks and labels -->
      ${yTickValues.map(tick => `
        <line x1="${margin.left - 6}" y1="${margin.top + yScale(tick)}" 
              x2="${margin.left}" y2="${margin.top + yScale(tick)}" 
              stroke="#374151" stroke-width="1"/>
        <text x="${margin.left - 12}" y="${margin.top + yScale(tick) + 4}" 
              text-anchor="end" font-size="12" fill="#374151">
          ${tick.toFixed(1)}
        </text>
      `).join('')}
      
      <!-- Chart elements -->
      ${chartElements}
      
      <!-- Axis labels -->
      <text x="${margin.left + chartWidth / 2}" y="${height - 20}" 
            text-anchor="middle" font-size="14" font-weight="500" fill="#374151">
        ${graphData.xLabel}
      </text>
      <text x="20" y="${margin.top + chartHeight / 2}" 
            text-anchor="middle" font-size="14" font-weight="500" fill="#374151" 
            transform="rotate(-90, 20, ${margin.top + chartHeight / 2})">
        ${graphData.yLabel}
      </text>
    </svg>
  `;
}

function parseGraphData(content: string): { content: string; graphs: { id: string; svg: string }[] } {
  const graphs: { id: string; svg: string }[] = [];
  let processedContent = content;

  // Find all GRAPH_DATA_START blocks
  const graphDataRegex = /GRAPH_DATA_START\s*\n([\s\S]*?)\nGRAPH_DATA_END/g;
  let match;
  let graphCounter = 0;

  while ((match = graphDataRegex.exec(content)) !== null) {
    const graphDataText = match[1].trim();
    const graphId = `graph-${graphCounter++}`;
    
    try {
      // Try to parse as JSON
      let graphData: GraphData;
      
      if (graphDataText.startsWith('{')) {
        graphData = JSON.parse(graphDataText);
      } else {
        // Try to parse structured text format
        const lines = graphDataText.split('\n');
        graphData = {
          type: 'line',
          title: 'Generated Graph',
          xLabel: 'X Axis',
          yLabel: 'Y Axis',
          data: []
        };

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('Type:')) {
            const type = trimmed.split(':')[1].trim().toLowerCase();
            if (type === 'line' || type === 'bar' || type === 'scatter') {
              graphData.type = type as 'line' | 'bar' | 'scatter';
            }
          } else if (trimmed.startsWith('Title:')) {
            graphData.title = trimmed.split(':', 2)[1].trim();
          } else if (trimmed.startsWith('X Label:') || trimmed.startsWith('X-axis:')) {
            graphData.xLabel = trimmed.split(':', 2)[1].trim();
          } else if (trimmed.startsWith('Y Label:') || trimmed.startsWith('Y-axis:')) {
            graphData.yLabel = trimmed.split(':', 2)[1].trim();
          } else if (trimmed.startsWith('Data:') || trimmed.startsWith('Points:')) {
            // Skip header
            continue;
          } else if (trimmed.includes(',') || trimmed.includes(':')) {
            // Try to parse data points
            const parts = trimmed.split(/[,:]/).map(p => p.trim());
            if (parts.length >= 2) {
              const x = parseFloat(parts[0]);
              const y = parseFloat(parts[1]);
              if (!isNaN(x) && !isNaN(y)) {
                graphData.data.push({ x, y });
              }
            }
          }
        }
      }

      // Validate required fields
      if (graphData.data && graphData.data.length > 0) {
        const svg = createSVGChart(graphData);
        graphs.push({ id: graphId, svg });
        
        // Replace the graph data block with a placeholder
        processedContent = processedContent.replace(
          match[0], 
          `<div class="graph-placeholder" data-graph-id="${graphId}"></div>`
        );
      }
    } catch (error) {
      console.error('Failed to parse graph data:', error);
      // Leave the original text if parsing fails
    }
  }

  return { content: processedContent, graphs };
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      // Parse graph data and extract SVGs
      const { content: processedContent, graphs } = parseGraphData(content);
      
      // Process text content
      let htmlContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      // Wrap in paragraphs if not already wrapped
      if (!htmlContent.startsWith('<p>')) {
        htmlContent = '<p>' + htmlContent + '</p>';
      }

      containerRef.current.innerHTML = htmlContent;
      containerRef.current.classList.add('math-content');
      
      // Insert SVG graphs
      graphs.forEach(({ id, svg }) => {
        const placeholder = containerRef.current?.querySelector(`[data-graph-id="${id}"]`);
        if (placeholder) {
          const graphContainer = document.createElement('div');
          graphContainer.className = 'graph-container my-6 p-4 bg-slate-50 border border-slate-200 rounded-lg';
          graphContainer.innerHTML = `
            <div class="flex items-center mb-3">
              <span class="text-sm font-medium text-slate-700">📊 Generated Graph</span>
            </div>
            <div class="flex justify-center">
              ${svg}
            </div>
          `;
          placeholder.replaceWith(graphContainer);
        }
      });
      
      // Force MathJax to render all mathematical content
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]).catch(console.error);
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
