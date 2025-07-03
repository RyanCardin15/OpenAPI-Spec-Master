import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  GitBranch, 
  ChevronDown, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  dependencies: string[];
  x: number;
  y: number;
  level: number;
  expanded: boolean;
  children: TreeNode[];
}

interface DependencyTreeVisualizationProps {
  schemas: { [key: string]: any };
  dependencyMap: Map<string, string[]>;
  className?: string;
}

export const DependencyTreeVisualization: React.FC<DependencyTreeVisualizationProps> = ({
  schemas,
  dependencyMap,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Constants for layout
  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 60;
  const LEVEL_HEIGHT = 120;
  const NODE_SPACING = 40;

  // Build tree structure
  useEffect(() => {
    const buildTree = () => {
      const schemaNames = Object.keys(schemas);
      const visited = new Set<string>();
      const treeNodes: TreeNode[] = [];

      // Find root nodes (schemas not referenced by others)
      const referencedSchemas = new Set<string>();
      Array.from(dependencyMap.values()).forEach(deps => {
        deps.forEach(dep => referencedSchemas.add(dep));
      });

      const rootSchemas = schemaNames.filter(name => !referencedSchemas.has(name));
      
      // If no clear roots, use schemas with fewest dependencies
      const actualRoots = rootSchemas.length > 0 ? rootSchemas : 
        schemaNames.slice(0, Math.min(5, schemaNames.length));

      const createNode = (
        name: string, 
        level: number, 
        parentX: number = 0, 
        siblingIndex: number = 0,
        totalSiblings: number = 1
      ): TreeNode => {
        if (visited.has(name)) {
          // Return a reference node for circular dependencies
          return {
            id: `${name}-ref-${level}`,
            name: `${name} (ref)`,
            dependencies: [],
            x: parentX,
            y: level * LEVEL_HEIGHT,
            level,
            expanded: false,
            children: []
          };
        }

        visited.add(name);
        const dependencies = dependencyMap.get(name) || [];
        
        // Calculate position
        const totalWidth = Math.max(totalSiblings * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING, NODE_WIDTH);
        const startX = parentX - totalWidth / 2;
        const x = startX + siblingIndex * (NODE_WIDTH + NODE_SPACING) + NODE_WIDTH / 2;
        const y = level * LEVEL_HEIGHT + 50;

        const node: TreeNode = {
          id: name,
          name,
          dependencies,
          x,
          y,
          level,
          expanded: expandedNodes.has(name),
          children: []
        };

        // Create child nodes if expanded
        if (expandedNodes.has(name) && dependencies.length > 0) {
          node.children = dependencies.map((dep, index) => 
            createNode(dep, level + 1, x, index, dependencies.length)
          );
        }

        return node;
      };

      // Create tree starting from roots
      actualRoots.forEach((root, index) => {
        visited.clear(); // Reset for each root tree
        const rootNode = createNode(root, 0, index * (NODE_WIDTH + NODE_SPACING * 2), index, actualRoots.length);
        treeNodes.push(rootNode);
      });

      setNodes(treeNodes);
    };

    buildTree();
  }, [schemas, dependencyMap, expandedNodes]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: TreeNode) => {
    const isSelected = selectedNode === node.id;
    const hasChildren = node.dependencies.length > 0;
    const isExpanded = node.expanded;
    const isReference = node.name.includes('(ref)');

    return (
      <g key={node.id} transform={`translate(${node.x - NODE_WIDTH/2}, ${node.y - NODE_HEIGHT/2})`}>
        {/* Node background */}
        <rect
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={8}
          fill={isSelected ? '#3B82F6' : isReference ? '#F59E0B' : '#FFFFFF'}
          stroke={isSelected ? '#1D4ED8' : isReference ? '#D97706' : '#E5E7EB'}
          strokeWidth={isSelected ? 3 : 2}
          className="cursor-pointer transition-all duration-200 hover:shadow-lg"
          onClick={() => setSelectedNode(node.id)}
          style={{
            filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : 'none'
          }}
        />

        {/* Node icon */}
        <g transform="translate(12, 12)">
          <Database 
            size={16} 
            color={isSelected ? '#FFFFFF' : isReference ? '#D97706' : '#6B7280'} 
          />
        </g>

        {/* Node text */}
        <text
          x={NODE_WIDTH / 2}
          y={NODE_HEIGHT / 2 + 4}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill={isSelected ? '#FFFFFF' : '#374151'}
          className="pointer-events-none select-none"
        >
          {node.name.length > 18 ? `${node.name.substring(0, 15)}...` : node.name}
        </text>

        {/* Dependency count badge */}
        {node.dependencies.length > 0 && (
          <g transform={`translate(${NODE_WIDTH - 24}, 8)`}>
            <circle
              r={10}
              fill={isSelected ? '#FFFFFF' : '#3B82F6'}
              stroke={isSelected ? '#3B82F6' : '#FFFFFF'}
              strokeWidth={2}
            />
            <text
              textAnchor="middle"
              y={4}
              fontSize="10"
              fontWeight="600"
              fill={isSelected ? '#3B82F6' : '#FFFFFF'}
              className="pointer-events-none select-none"
            >
              {node.dependencies.length}
            </text>
          </g>
        )}

        {/* Expand/collapse button */}
        {hasChildren && (
          <g 
            transform={`translate(${NODE_WIDTH - 16}, ${NODE_HEIGHT - 16})`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}
          >
            <circle
              r={8}
              fill={isExpanded ? '#EF4444' : '#10B981'}
              className="transition-colors duration-200"
            />
            {isExpanded ? (
              <ChevronDown size={10} color="#FFFFFF" x={-5} y={-5} />
            ) : (
              <ChevronRight size={10} color="#FFFFFF" x={-5} y={-5} />
            )}
          </g>
        )}
      </g>
    );
  };

  const renderConnections = (node: TreeNode) => {
    if (!node.expanded || node.children.length === 0) return null;

    return node.children.map(child => (
      <g key={`${node.id}-${child.id}`}>
        {/* Connection line */}
        <path
          d={`M ${node.x} ${node.y + NODE_HEIGHT/2} 
              Q ${node.x} ${node.y + NODE_HEIGHT/2 + 30} 
                ${(node.x + child.x) / 2} ${(node.y + child.y) / 2}
              Q ${child.x} ${child.y - NODE_HEIGHT/2 - 30}
                ${child.x} ${child.y - NODE_HEIGHT/2}`}
          stroke="#6B7280"
          strokeWidth={2}
          fill="none"
          className="transition-all duration-300"
          markerEnd="url(#arrowhead)"
        />
        
        {/* Recursively render child connections */}
        {renderConnections(child)}
      </g>
    ));
  };

  const renderAllNodes = (nodeList: TreeNode[]): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(renderNode(node));
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodeList);
    return result;
  };

  const renderAllConnections = (nodeList: TreeNode[]): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(renderConnections(node));
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodeList);
    return result;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPan({ x: dx, y: dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      setPan({ x: dx, y: dy });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));

  // Calculate SVG dimensions
  const maxX = Math.max(...nodes.flatMap(node => [node.x + NODE_WIDTH/2]));
  const maxY = Math.max(...nodes.flatMap(node => [node.y + NODE_HEIGHT/2]));
  const minX = Math.min(...nodes.flatMap(node => [node.x - NODE_WIDTH/2]));
  const minY = Math.min(...nodes.flatMap(node => [node.y - NODE_HEIGHT/2]));
  
  const svgWidth = Math.max(800, maxX - minX + 200);
  const svgHeight = Math.max(600, maxY - minY + 200);

  return (
    <div className={`relative bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={zoomIn}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend</h5>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Schema</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Reference</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Dependency count</span>
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm max-w-xs">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {selectedNode.replace('-ref-', ' (reference at level ')}
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Click nodes to explore dependencies. Use controls to zoom and pan.
          </p>
        </div>
      )}

      {/* SVG Canvas */}
      <div 
        className="w-full h-96 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${minX - 100} ${minY - 100} ${svgWidth} ${svgHeight}`}
          className="transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
          }}
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6B7280"
              />
            </marker>
          </defs>

          {/* Grid pattern */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#grid)"
          />

          {/* Render connections first (behind nodes) */}
          {renderAllConnections(nodes)}

          {/* Render all nodes */}
          {renderAllNodes(nodes)}
        </svg>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>• Click nodes to select and explore</div>
          <div>• Click ▶/▼ to expand/collapse dependencies</div>
          <div>• Drag to pan, use controls to zoom</div>
        </div>
      </div>
    </div>
  );
};