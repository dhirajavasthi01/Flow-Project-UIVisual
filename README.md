# Flow Project - Data Fetching and SVG Rendering Guide

This document explains how data is fetched from the database and how that data is used to render SVG nodes in the Flow diagram application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Structure](#database-structure)
3. [Data Fetching Flow](#data-fetching-flow)
4. [SVG Rendering Process](#svg-rendering-process)
5. [Data Flow Diagram](#data-flow-diagram)
6. [Key Components](#key-components)

---

## Architecture Overview

The application follows a client-server architecture:

```
Frontend (React) → API Services → Express Server → PostgreSQL Database
```

The flow diagram data (nodes and edges) is stored in PostgreSQL and fetched through REST APIs, then rendered as interactive SVG nodes using React Flow.

---

## Database Structure

### Table: `Flow_diagrams`

The main table storing flow diagram data:

| Column | Type | Description |
|--------|------|-------------|
| `diagramId` | SERIAL PRIMARY KEY | Unique identifier for each diagram |
| `caseID` | INTEGER | Case identifier (used for querying) |
| `nodeJson` | JSONB | Array of node objects (stored as JSON) |
| `edgeJson` | JSONB | Array of edge objects (stored as JSON) |
| `saved` | BOOLEAN | Whether the diagram has been saved |
| `active` | INTEGER | Active status flag |
| `createdOn` | TIMESTAMP | Creation timestamp |
| `createdBy` | VARCHAR | Creator identifier |
| `modifiedOn` | TIMESTAMP | Last modification timestamp |

### Node Data Structure

Each node in `nodeJson` contains:

```javascript
{
  id: "bearing-12345678",
  type: "baseSvgNode",
  nodeType: "bearing",  // Used to map to SVG file
  position: { x: 100, y: 200 },
  data: {
    nodeColor: "#d3d3d3",        // Fill color
    strokeColor: "#000000",      // Stroke color
    tag: "Bearing Tag",          // Display text above SVG
    subTag: "Sub Tag",           // Display text below SVG
    gradientStart: "#cc0000",    // Optional: gradient start color
    gradientEnd: "#cc0000",      // Optional: gradient end color
    subComponentAssetId: "123",  // Used for matching with tableData
    failureModeNames: [],        // Failure mode information
    shouldBlink: false,          // Blink animation flag
    width: 100,                  // Node width
    height: 100                  // Node height
  }
}
```

---

## Data Fetching Flow

### 1. Database Connection

**File:** `Flow-Project/server/database/connection.js`

The application uses PostgreSQL connection pooling:

```javascript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'react_flow_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});
```

### 2. API Endpoint

**File:** `Flow-Project/server/routes/flowDiagramRoutes.js`

**GET Endpoint:** `/flow-diagrams/:caseId`

```javascript
router.get('/:caseId', async (req, res) => {
  const { caseId } = req.params;
  
  const result = await pool.query(
    `SELECT 
      "diagramId", "caseID", "nodeJson", "edgeJson", 
      saved, active, "createdOn", "createdBy", "modifiedOn"
    FROM Flow_diagrams 
    WHERE "caseID" = $1 
    ORDER BY "modifiedOn" DESC 
    LIMIT 1`,
    [caseId]
  );
  
  // Returns nodeJson and edgeJson as JSON strings
  res.json({
    diagramId: diagram.diagramId,
    caseID: diagram.caseID,
    nodeJson: JSON.stringify(diagram.nodeJson),
    edgeJson: JSON.stringify(diagram.edgeJson),
    // ... other fields
  });
});
```

### 3. Frontend Service Layer

**File:** `Flow-Project/src/services/FlowServices.js`

```javascript
export async function getFlowDiagram(caseId = 1) {
  const url = `${API_BASE_URL}/flow-diagrams/${caseId}`;
  return await HttpClient.get(url);
}
```

### 4. React Query Hook

**File:** `Flow-Project/src/components/flow/hooks/useFlowData/useFlowData.js`

The `useFlowData` hook manages data fetching with React Query:

```javascript
export function useFlowData(caseId = 1) {
  // Transform API data to usable format
  const transformData = (data) => {
    if (!data) return null;
    return {
      ...data,
      nodes: JSON.parse(data.nodeJson || '[]').map(node => ({
        ...node,
        data: { 
          ...node.data, 
          nodeType: node.nodeType || node.data?.nodeType 
        }
      })),
      edges: JSON.parse(data.edgeJson || '[]')
    };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['flow-diagram', caseId],
    queryFn: async () => {
      return await getFlowDiagram(caseId);
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    select: transformData
  });

  return {
    nodes: data?.nodes || [],
    edges: data?.edges || [],
    diagramId: data?.diagramId,
    isLoading,
    error
  };
}
```

### 5. Flow Component Integration

**File:** `Flow-Project/src/components/flow/Flow.jsx`

The Flow component consumes the hook:

```javascript
function Flow(props) {
  const { caseId } = useOutletContext();
  
  const {
    nodes: fetchedNodes,
    edges: fetchedEdges,
    isLoading: loadingFlow,
    error
  } = useFlowData(caseId);

  // Process nodes with tableData for dynamic styling
  useEffect(() => {
    if (fetchedNodes.length > 0 && !loadingFlow) {
      const processedNodes = processNodesWithTableData(fetchedNodes);
      setNodes(processedNodes);
      setEdges(fetchedEdges);
    }
  }, [fetchedNodes, fetchedEdges, loadingFlow]);
  
  // Render ReactFlow with nodes and edges
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      // ... other props
    />
  );
}
```

---

## SVG Rendering Process

### Node Type Generation Flow

This section explains how SVG files are dynamically converted into React node components.

#### Step 1: NodeEdgeTypes.js - Import SVG Files and Extract Filenames

**File:** `Flow-Project/src/components/flow/NodeEdgeTypes.js`

The process starts by dynamically importing all SVG files from the `flowIcons` folder:

```javascript
// Dynamically import all SVG files from the flowIcons folder
const svgModules = import.meta.glob('../../assets/flowIcons/*.svg', { eager: true });

// Extract filename from each SVG path
const dynamicNodes = Object.keys(svgModules).reduce((acc, path) => {
  // Extract filename from path (e.g., "../../assets/flowIcons/Bearing.svg" → "Bearing.svg")
  const filename = path.split('/').pop();
  
  if (!filename) return acc;
  
  try {
    // Call generateNodeExports function with the filename
    const nodeExports = generateNodeExports(filename);
    
    // Store the generated exports
    acc[filename] = {
      exports: nodeExports,
      kebabName: toKebabCase(filename),  // "Bearing.svg" → "bearing"
      camelName: toCamelCase(filename),   // "Bearing.svg" → "bearing"
    };
  } catch (error) {
    // Silently skip nodes that fail to generate
  }
  
  return acc;
}, {});
```

**Flow:** `NodeEdgeTypes.js` → Extracts filename → Calls `generateNodeExports(filename)`

#### Step 2: generateNodeExports Function - Generate Node Components

**File:** `Flow-Project/src/components/flow/utils/generateNode.jsx`

The `generateNodeExports` function receives the filename and generates three exports:
- NodeFieldConfig (field configuration)
- NodeConfig (node configuration)
- Node Component (React component)

```javascript
export function generateNodeExports(filename) {
  try {
    const pascalName = toPascalCase(filename); // "Bearing.svg" → "Bearing"
    
    // Generate the three required exports
    const fieldConfig = generateNodeFieldConfig(filename);
    const nodeConfig = generateNodeConfig(filename);
    const nodeComponent = generateNodeComponent(filename); // This will use svgMap
    
    return {
      [`${pascalName}NodeFieldConfig`]: fieldConfig,
      [`${pascalName}NodeConfig`]: nodeConfig,
      [`${pascalName}Node`]: nodeComponent,
    };
  } catch (error) {
    return null;
  }
}
```

**Flow:** `generateNodeExports(filename)` → Calls `generateNodeComponent(filename)`

#### Step 3: generateNodeComponent Function - Create Node Component

**File:** `Flow-Project/src/components/flow/utils/generateNode.jsx`

The `generateNodeComponent` function creates a React component that will use `svgMap`:

```javascript
export function generateNodeComponent(filename) {
  const kebabName = toKebabCase(filename); // "Bearing.svg" → "bearing"
  
  const NodeComponent = ({ data, id, selected, type }) => {
    const { getNode } = useReactFlow();
    const node = getNode(id);
    
    // Get nodeType (kebab-case name) - this will be used to lookup in svgMap
    const nodeType = node?.nodeType || data?.nodeType || kebabName;
    
    const nodeCommon = useNodeCommon(id, data);

    return (
      <BaseSvgNode
        id={id}
        data={data}
        selected={selected}
        type={type}
        nodeType={nodeType}  // Pass nodeType to BaseSvgNode
        // ... other props
      />
    );
  };

  return memo(NodeComponent);
}
```

**Flow:** `generateNodeComponent(filename)` → Creates component → Passes `nodeType` to `BaseSvgNode`

#### Step 4: BaseSvgNode - Lookup SVG Path from svgMap

**File:** `Flow-Project/src/components/flow/nodes/BaseSvgNode.jsx`

The `BaseSvgNode` component receives the `nodeType` and uses it to lookup the SVG path from `svgMap`:

```javascript
import { svgMap } from '../svgMap';

const BaseSvgNode = ({ id, data, nodeType, ... }) => {
  // Use nodeType to lookup SVG path from svgMap
  const svgPathValue = svgMap[nodeType];  // e.g., svgMap["bearing"]
  const svgPath = (typeof svgPathValue === 'string') ? svgPathValue : null;
  
  return (
    <NodeResizer>
      <SvgNode
        id={id}
        data={data}
        svgPath={svgPath}  // Pass the resolved SVG path
        nodeType={nodeType}
        // ... other props
      />
    </NodeResizer>
  );
};
```

**Flow:** `BaseSvgNode` → Uses `nodeType` → Looks up `svgMap[nodeType]` → Gets SVG path

#### Step 5: svgMap - SVG File Path Mapping

**File:** `Flow-Project/src/components/flow/svgMap.jsx`

The `svgMap` object maps node types (kebab-case) to SVG file paths:

```javascript
// Dynamically imports all SVG files from assets/flowIcons
const svgModules = import.meta.glob('../../assets/flowIcons/*.svg', { 
  eager: true,
  import: 'default'
});

// Creates mapping: { "bearing": "/path/to/bearing.svg", ... }
export const svgMap = Object.keys(svgModules).reduce((acc, path) => {
  const filename = path.split('/').pop();  // "Bearing.svg"
  const nodeType = toKebabCase(filename);  // "Bearing.svg" → "bearing"
  acc[nodeType] = svgModules[path];        // Store SVG path
  return acc;
}, {});
```

**Result:** `svgMap["bearing"]` → Returns the path to `Bearing.svg` file

### Complete Flow Diagram

```
┌─────────────────────────────────────┐
│  NodeEdgeTypes.js                  │
│  ───────────────────────           │
│  1. Import SVG files               │
│  2. Extract filename               │
│  3. Call generateNodeExports()     │
└──────────────┬─────────────────────┘
               │
               │ filename: "Bearing.svg"
               ▼
┌─────────────────────────────────────┐
│  generateNodeExports(filename)     │
│  ───────────────────────           │
│  1. Generate NodeFieldConfig       │
│  2. Generate NodeConfig            │
│  3. Call generateNodeComponent()   │
└──────────────┬─────────────────────┘
               │
               │ filename: "Bearing.svg"
               ▼
┌─────────────────────────────────────┐
│  generateNodeComponent(filename)    │
│  ───────────────────────             │
│  1. Convert to kebab-case          │
│  2. Create React component          │
│  3. Pass nodeType to BaseSvgNode   │
└──────────────┬─────────────────────┘
               │
               │ nodeType: "bearing"
               ▼
┌─────────────────────────────────────┐
│  BaseSvgNode                        │
│  ───────────────────────             │
│  1. Receive nodeType prop           │
│  2. Lookup svgMap[nodeType]         │
│  3. Get SVG file path               │
└──────────────┬─────────────────────┘
               │
               │ svgPath: "/path/to/Bearing.svg"
               ▼
┌─────────────────────────────────────┐
│  svgMap                             │
│  ───────────────────────             │
│  {                                  │
│    "bearing": "/path/to/Bearing.svg"│
│    "pump": "/path/to/Pump.svg"     │
│    ...                              │
│  }                                  │
└─────────────────────────────────────┘
```

### Example: Complete Flow for "Bearing.svg"

1. **NodeEdgeTypes.js** extracts filename: `"Bearing.svg"`
2. Calls `generateNodeExports("Bearing.svg")`
3. **generateNodeExports** calls `generateNodeComponent("Bearing.svg")`
4. **generateNodeComponent** converts to kebab-case: `"bearing"` and creates component
5. Component passes `nodeType="bearing"` to `BaseSvgNode`
6. **BaseSvgNode** looks up `svgMap["bearing"]`
7. **svgMap** returns: `"/src/assets/flowIcons/Bearing.svg"`
8. SVG path is passed to `SvgNode` component for rendering

### 6. Base SVG Node Component (Already covered above)

**File:** `Flow-Project/src/components/flow/nodes/BaseSvgNode.jsx`

This component receives the `nodeType` from the generated component and uses it to lookup the SVG path from `svgMap`. See Step 4 in the [Node Type Generation Flow](#step-4-basesvgnode---lookup-svg-path-from-svgmap) section above.

### 7. SVG Node Component (Federated)

**File:** `Flow-Project-UIVisual/src/components/flow/SvgNode.jsx`

This is the core component that receives the `svgPath` from `BaseSvgNode` (which was resolved from `svgMap`) and renders SVGs with dynamic styling:

#### Step 1: Fetch Raw SVG

```javascript
useEffect(() => {
  const fetchSvg = async () => {
    const response = await fetch(svgPath);
    const svgText = await response.text();
    setRawSvgText(svgText);
  };
  fetchSvg();
}, [svgPath]);
```

#### Step 2: Process SVG with Data

```javascript
const processSvg = ({
  svgText,
  fillColor,
  strokeColor,
  gradientStart,
  gradientEnd,
  isSelected,
  isHighlighted,
  // ... other props
}) => {
  // Parse SVG string to DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgElement = doc.documentElement;

  // Setup viewBox for proper scaling
  setupSvgViewBox(svgElement);
  
  // Apply highlight class if needed
  applyHighlightClass(svgElement, isHighlighted);
  
  // Apply colors based on gradient or solid color
  if (gradientStart && gradientEnd) {
    // Create gradient definition and apply
    processGradientMode({ svgElement, gradientStart, gradientEnd, ... });
  } else {
    // Apply solid fill color
    processSolidColorMode({ svgElement, fillColor, ... });
  }
  
  // Apply stroke styles
  applyStrokeStyles(svgElement, strokeColor, ...);
  
  return svgElement.outerHTML; // Return processed SVG as HTML string
};
```

#### Step 3: Render Processed SVG

```javascript
const svgContent = useMemo(() => {
  if (!rawSvgText) return null;
  return processSvg({
    svgText: rawSvgText,
    fillColor: nodeColor,
    strokeColor,
    gradientStart,
    gradientEnd,
    // ... other props from data
  });
}, [rawSvgText, nodeColor, strokeColor, gradientStart, gradientEnd, ...]);

// Render using dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: svgContent }} />
```

### 8. Dynamic Styling Based on Data

The SVG nodes can be dynamically styled based on:

- **Node Color**: `data.nodeColor` → Applied as fill color
- **Stroke Color**: `data.strokeColor` → Applied to stroke elements
- **Gradient**: `data.gradientStart` + `data.gradientEnd` → Creates linear gradient
- **Highlight**: `isHighlighted` → Adds highlight class
- **Selection**: `isSelected` → Changes stroke to blue with glow effect
- **Blink Animation**: `data.shouldBlink` → Applies CSS animation

### 9. Integration with Table Data

**File:** `Flow-Project/src/components/flow/Flow.jsx`

When `tableData` is provided, nodes are matched and styled:

```javascript
const processNodesWithTableData = (nodesToProcess) => {
  return nodesToProcess.map(node => {
    const subComponentAssetId = node.data?.subComponentAssetId;
    
    // Find matching entries in tableData
    const matchingTableDataEntries = tableData.filter(
      item => hasSubComponentAssetIdMatch(subComponentAssetId, item.subComponentAssetId)
    );
    
    if (matchingTableDataEntries.length > 0) {
      // Update node colors to red for failure modes
      if (nodeData.gradientStart || nodeData.gradientEnd) {
        nodeData.gradientStart = '#cc0000';
        nodeData.gradientEnd = '#cc0000';
      } else {
        nodeData.nodeColor = '#cc0000';
      }
      
      // Set failure mode names and blink status
      nodeData.failureModeNames = [...];
      nodeData.shouldBlink = shouldBlink;
    }
    
    return { ...node, data: nodeData };
  });
};
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  PostgreSQL DB  │
│  Flow_diagrams   │
└────────┬────────┘
         │
         │ SQL Query (nodeJson, edgeJson)
         ▼
┌─────────────────┐
│ Express Server  │
│ GET /flow-      │
│ diagrams/:id    │
└────────┬────────┘
         │
         │ JSON Response
         ▼
┌─────────────────┐
│ FlowServices.js │
│ getFlowDiagram()│
└────────┬────────┘
         │
         │ HTTP GET
         ▼
┌─────────────────┐
│  useFlowData()  │
│  React Query    │
└────────┬────────┘
         │
         │ Parsed nodes & edges
         ▼
┌─────────────────┐
│   Flow.jsx      │
│ processNodes    │
│ WithTableData() │
└────────┬────────┘
         │
         │ Styled nodes
         ▼
┌─────────────────┐
│  BaseSvgNode    │
│  (nodeTypes)    │
└────────┬────────┘
         │
         │ svgPath from svgMap
         ▼
┌─────────────────┐
│   SvgNode.jsx   │
│  Fetch SVG      │
│  Process SVG    │
│  Apply Colors   │
└────────┬────────┘
         │
         │ Rendered SVG HTML
         ▼
┌─────────────────┐
│  React Flow     │
│  Canvas         │
└─────────────────┘
```

---

## Key Components

### Backend Components

1. **`server/database/connection.js`**
   - PostgreSQL connection pool
   - Environment-based configuration

2. **`server/routes/flowDiagramRoutes.js`**
   - REST API endpoints
   - Database queries for CRUD operations

### Frontend Components

1. **`src/services/FlowServices.js`**
   - API service functions
   - HTTP client wrapper

2. **`src/components/flow/hooks/useFlowData/useFlowData.js`**
   - React Query hook for data fetching
   - Data transformation logic
   - Caching and error handling

3. **`src/components/flow/Flow.jsx`**
   - Main flow diagram component
   - Node/edge state management
   - Integration with React Flow library

4. **`src/components/flow/NodeEdgeTypes.js`**
   - Entry point for node type generation
   - Imports all SVG files dynamically
   - Calls `generateNodeExports(filename)` for each SVG file
   - Builds `nodeTypes`, `allNodes`, and `nodeTypesConfig` objects

5. **`src/components/flow/utils/generateNode.jsx`**
   - Contains `generateNodeExports(filename)` function
   - Generates NodeFieldConfig, NodeConfig, and Node components
   - Creates components that use `svgMap` for SVG path resolution

6. **`src/components/flow/svgMap.jsx`**
   - SVG file path mapping
   - Maps node types (kebab-case) to SVG file paths
   - Used by `BaseSvgNode` to resolve SVG paths

7. **`src/components/flow/nodes/BaseSvgNode.jsx`**
   - Node wrapper component
   - Resize functionality
   - Uses `svgMap[nodeType]` to resolve SVG path
   - Passes resolved path to `SvgNode` component

8. **`Flow-Project-UIVisual/src/components/flow/SvgNode.jsx`**
   - Core SVG rendering component
   - Receives `svgPath` from `BaseSvgNode`
   - SVG fetching and processing
   - Dynamic styling application
   - Gradient and color management

---

## Example: Complete Data Flow

### 1. Database Query

```sql
SELECT "nodeJson", "edgeJson" 
FROM Flow_diagrams 
WHERE "caseID" = 1
ORDER BY "modifiedOn" DESC 
LIMIT 1
```

### 2. API Response

```json
{
  "diagramId": 123,
  "caseID": 1,
  "nodeJson": "[{\"id\":\"bearing-123\",\"nodeType\":\"bearing\",\"data\":{\"nodeColor\":\"#d3d3d3\"}}]",
  "edgeJson": "[{\"id\":\"e1-2\",\"source\":\"bearing-123\",\"target\":\"pump-456\"}]"
}
```

### 3. Transformed Data

```javascript
{
  nodes: [
    {
      id: "bearing-123",
      nodeType: "bearing",
      data: {
        nodeColor: "#d3d3d3",
        strokeColor: "#000000",
        // ... other properties
      }
    }
  ],
  edges: [...]
}
```

### 4. SVG Path Resolution

```javascript
// svgMap lookup
svgMap["bearing"] → "/src/assets/flowIcons/Bearing.svg"
```

### 5. SVG Processing

```javascript
// Fetch SVG file
fetch("/src/assets/flowIcons/Bearing.svg")
  .then(response => response.text())
  .then(svgText => {
    // Parse and modify SVG
    // Apply nodeColor as fill
    // Apply strokeColor to strokes
    // Return modified SVG HTML
  });
```

### 6. Final Rendering

```jsx
<div dangerouslySetInnerHTML={{ __html: processedSvgHtml }} />
```

---

## Summary

1. **Data Storage**: Flow diagrams are stored in PostgreSQL as JSONB columns (`nodeJson`, `edgeJson`)

2. **Data Fetching**: 
   - Express server queries database
   - Returns JSON strings
   - Frontend service layer makes HTTP requests
   - React Query hook manages caching and state

3. **Data Processing**:
   - JSON strings are parsed into node/edge arrays
   - Nodes are matched with `tableData` for dynamic styling
   - Node properties (colors, gradients) are extracted from `data` object

4. **SVG Rendering**:
   - **Node Type Generation**: `NodeEdgeTypes.js` imports SVG files and calls `generateNodeExports(filename)` for each file
   - **Component Generation**: `generateNodeExports` creates node components that use `svgMap` to resolve SVG paths
   - **Path Resolution**: `BaseSvgNode` uses `nodeType` to lookup `svgMap[nodeType]` and get the SVG file path
   - **SVG Processing**: SVG file is fetched as text, parsed, and modified using DOM manipulation
   - **Styling**: Colors, gradients, and styles are applied based on node data
   - **Rendering**: Processed SVG HTML is rendered using `dangerouslySetInnerHTML`

5. **Dynamic Features**:
   - Colors change based on failure modes (red for failures)
   - Blink animation for recent failures
   - Gradient or solid color support
   - Selection and highlight states

This architecture allows for flexible, data-driven SVG rendering with real-time updates and dynamic styling based on database content.
