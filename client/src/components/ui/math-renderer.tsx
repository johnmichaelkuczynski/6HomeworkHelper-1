import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface MathRendererProps {
  content: string;
  className?: string;
}

interface GraphData {
  type: string;
  title: string;
  xLabel: string;
  yLabel: string;
  data: Array<{x: number, y: number, category?: string}>;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const parseGraphData = (graphBlock: string): GraphData | null => {
    try {
      // Extract JSON from the GRAPH_DATA_START block
      const jsonMatch = graphBlock.match(/GRAPH_DATA_START\s*\n([\s\S]*?)(?=GRAPH_DATA_END|$)/);
      if (!jsonMatch) return null;

      const jsonStr = jsonMatch[1].trim();
      const graphData = JSON.parse(jsonStr);
      
      return graphData;
    } catch (error) {
      console.error('Error parsing graph data:', error);
      return null;
    }
  };

  const createChart = (canvas: HTMLCanvasElement, graphData: GraphData) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prepare data based on graph type
    let chartData;
    let chartType: 'line' | 'bar' | 'scatter' = 'line';

    if (graphData.type === 'line' || graphData.type === 'scatter') {
      chartType = graphData.type as 'line' | 'scatter';
      
      // Group data by category if available
      const categoryMap: {[key: string]: boolean} = {};
      graphData.data.forEach(d => {
        categoryMap[d.category || 'Data'] = true;
      });
      const categories = Object.keys(categoryMap);
      const datasets = categories.map((category, index) => {
        const categoryData = graphData.data.filter(d => (d.category || 'Data') === category);
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
        
        return {
          label: category,
          data: categoryData.map(d => ({ x: d.x, y: d.y })),
          borderColor: colors[index % colors.length],
          backgroundColor: chartType === 'scatter' ? colors[index % colors.length] : colors[index % colors.length] + '20',
          fill: false,
          tension: 0.1
        };
      });

      chartData = { datasets };
    } else {
      // Default to line chart
      chartType = 'line';
      chartData = {
        datasets: [{
          label: 'Data',
          data: graphData.data.map(d => ({ x: d.x, y: d.y })),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          fill: false,
          tension: 0.1
        }]
      };
    }

    const config: ChartConfiguration = {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: graphData.title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: graphData.xLabel,
              font: { size: 14 }
            },
            type: 'linear'
          },
          y: {
            display: true,
            title: {
              display: true,
              text: graphData.yLabel,
              font: { size: 14 }
            }
          }
        }
      }
    };

    new Chart(ctx, config);
  };

  useEffect(() => {
    if (containerRef.current && content) {
      // Clear existing content
      containerRef.current.innerHTML = '';

      // Split content by GRAPH_DATA_START blocks
      const parts = content.split(/GRAPH_DATA_START[\s\S]*?(?=GRAPH_DATA_END|(?=GRAPH_DATA_START)|$)/g);
      const graphBlocks = content.match(/GRAPH_DATA_START[\s\S]*?(?=GRAPH_DATA_END|(?=GRAPH_DATA_START)|$)/g) || [];

      let currentPartIndex = 0;
      let currentGraphIndex = 0;

      // Process each part of the content
      for (let i = 0; i < parts.length + graphBlocks.length; i++) {
        if (i % 2 === 0 && currentPartIndex < parts.length) {
          // Text content
          const textPart = parts[currentPartIndex];
          if (textPart.trim()) {
            const textDiv = document.createElement('div');
            
            let processedContent = textPart
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br/>');

            if (!processedContent.startsWith('<p>')) {
              processedContent = '<p>' + processedContent + '</p>';
            }

            textDiv.innerHTML = processedContent;
            containerRef.current.appendChild(textDiv);
          }
          currentPartIndex++;
        } else if (currentGraphIndex < graphBlocks.length) {
          // Graph content
          const graphBlock = graphBlocks[currentGraphIndex];
          const graphData = parseGraphData(graphBlock);
          
          if (graphData) {
            // Create graph container
            const graphContainer = document.createElement('div');
            graphContainer.className = 'graph-container mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg';
            
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 400;
            canvas.style.maxWidth = '100%';
            canvas.style.height = '400px';
            
            graphContainer.appendChild(canvas);
            containerRef.current.appendChild(graphContainer);
            
            // Create chart
            setTimeout(() => createChart(canvas, graphData), 100);
          }
          currentGraphIndex++;
        }
      }

      containerRef.current.classList.add('math-content');
      
      // Force MathJax to render all mathematical content
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
