import { getSmoothStepPath } from "@xyflow/react";

const FlowingPipeEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, type }) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const getCssNameByType = () => {
    if (type) {
      return `edgeStoke-${type}`;
    }
    return "";
  };

  // Apply strokeDasharray for dotted edges
  const getEdgeStyle = () => {
    const baseStyle = { ...style };
    
    // If type is dotted or dottedArrow, add strokeDasharray
    if (type === 'dotted' || type === 'dottedArrow') {
      baseStyle.strokeDasharray = style.strokeDasharray || '5,5';
    } else {
      // Remove strokeDasharray for non-dotted edges
      const { strokeDasharray, ...rest } = baseStyle;
      return rest;
    }
    
    return baseStyle;
  };

  const edgeStyle = getEdgeStyle();

  return (
    <>
      <path id={id} style={edgeStyle} className={`react-flow__edge-path flowingPipe ${getCssNameByType()}`} d={edgePath} markerEnd={markerEnd} />
      <path id={id} style={edgeStyle} className={`react-flow__edge-path flowingPipeAnimated ${getCssNameByType()}`} d={edgePath} markerEnd={markerEnd} />
    </>
  );
};

export default FlowingPipeEdge;

