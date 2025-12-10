import { useState, useEffect, useRef, useCallback, memo } from 'react';
import "react-tooltip/dist/react-tooltip.css";
import variables from '../../assets/Variables';
import { NodeTooltip, NodeTooltipContent, useNodeTooltip } from './nodeTooltip/nodeTooltip';


// Inner component that uses the tooltip hook directly - no wrapper affecting layout
// Memoized to prevent React from treating it as a new component on every render
const SvgContent = memo(({ svgContent, svgPath, isHighlighted, svgContainerRef, HandlesComponent, id, shouldApplyBlink }) => {
  const tooltip = useNodeTooltip();
  
  const handleMouseEnter = useCallback(() => {
    if (tooltip) {
      tooltip.showTooltip();
    }
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => {
    if (tooltip) {
      tooltip.hideTooltip();
    }
  }, [tooltip]);

  return (
    <div
      ref={svgContainerRef}
      data-tooltip-id={`tooltip-${id}`}
      className={shouldApplyBlink ? 'node-blink' : ''}
      style={{ position: "relative", width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {svgContent ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ width: "100%", flex: 1, minHeight: 0, pointerEvents: "none" }}
        />
      ) : (
        <img
          src={svgPath}
          alt="Node"
          style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "contain", pointerEvents: "none" }}
          className={isHighlighted ? "highlighted" : ""}
        />
      )}

      {HandlesComponent && <HandlesComponent id={id} containerRef={svgContainerRef} />}
    </div>
  );
});

SvgContent.displayName = 'SvgContent';

const SvgNode = ({
  id,
  data,
  nodeType,
  defaultNodeColor = "#d3d3d3",
  defaultStrokeColor = "#000000",
  HandlesComponent,
  isHighlighted = false,
  isSelected = false,
  isDeveloperMode = true,
  svgPath,
}) => {
  const {
    nodeColor = defaultNodeColor,
    strokeColor = defaultStrokeColor,
    tag,
    subTag,
    gradientStart,
    gradientEnd,
    title,
    failureModeNames,
    failureSymptomsName,
    shouldBlink = false
  } = data;

  const failureModeList = failureModeNames?.length ? failureModeNames : null;

  const [svgContent, setSvgContent] = useState(null);
  const [useDefaultSvgColors, setUseDefaultSvgColors] = useState(true);
  const svgContainerRef = useRef(null);

  // Helper function to setup SVG viewBox
  const setupSvgViewBox = (svgElement) => {
    const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tempSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    tempSvg.style.position = "absolute";
    tempSvg.style.visibility = "hidden";
    tempSvg.style.width = "0";
    tempSvg.style.height = "0";

    document.body.appendChild(tempSvg);
    Array.from(svgElement.childNodes).forEach(node => tempSvg.appendChild(node.cloneNode(true)));

    const bbox = tempSvg.getBBox();
    document.body.removeChild(tempSvg);

    svgElement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    svgElement.setAttribute("width", "100%");
    svgElement.setAttribute("height", "100%");
    svgElement.setAttribute("preserveAspectRatio", "none");
  };

  // Helper function to apply highlight class
  const applyHighlightClass = (svgElement, isHighlighted) => {
    if (!isHighlighted) return;
    const existingClass = svgElement.getAttribute("class") || "";
    svgElement.setAttribute("class", `${existingClass} ${"highlighted"}`.trim());
  };

  // Helper function to apply selected stroke styles (before gradient/solid color processing)
  const applyInitialSelectedStrokeStyles = (svgElement, isSelected, isDeveloperMode) => {
    if (!isSelected || isDeveloperMode) return;
    svgElement.querySelectorAll("[stroke]").forEach(el => {
      if (el.getAttribute("stroke") !== "none") {
        el.setAttribute("stroke-width", "1px");
        el.setAttribute("stroke", "#0066ff");
        el.style.filter = "drop-shadow(0 0 1px rgba(0, 102, 255, 0.8))";
      }
    });
  };

  // Helper function to create gradient definition
  const createGradientDefinition = (doc, gradientId, gradientStart, gradientEnd) => {
    const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
    const linearGrad = doc.createElementNS("http://www.w3.org/2000/svg", "linearGradient");

    linearGrad.setAttribute("id", gradientId);
    linearGrad.setAttribute("x1", "0%");
    linearGrad.setAttribute("y1", "0%");
    linearGrad.setAttribute("x2", "0%");
    linearGrad.setAttribute("y2", "100%");

    const createStop = (offset, color) => {
      const stop = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      return stop;
    };

    linearGrad.appendChild(createStop("0%", gradientStart));
    linearGrad.appendChild(createStop("50%", gradientEnd));
    linearGrad.appendChild(createStop("100%", gradientStart));

    defs.appendChild(linearGrad);
    return defs;
  };

  // Helper function to apply gradient fill
  const applyGradientFill = (svgElement, gradientId) => {
    svgElement.querySelectorAll("[fill]").forEach(el => {
      if (el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", `url(#${gradientId})`);
      }
    });
  };

  // Helper function to apply stroke styles with selected state handling
  const applyStrokeStyles = (svgElement, strokeColor, isSelected, isDeveloperMode, selectedStrokeColor, selectedFilter) => {
    svgElement.querySelectorAll("[stroke]").forEach(el => {
      if (el.getAttribute("stroke") === "none") return;
      
      el.setAttribute("stroke", strokeColor);
      
      if (isSelected && !isDeveloperMode) {
        el.setAttribute("stroke-width", "1px");
        el.setAttribute("stroke", selectedStrokeColor);
        el.style.filter = selectedFilter;
      }
    });
  };

  // Helper function to apply fill color
  const applyFillColor = (svgElement, fillColor) => {
    if (!fillColor) return;
    svgElement.querySelectorAll("[fill]").forEach(el => {
      if (el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", fillColor);
      }
    });
  };

  // Helper function to process gradient mode
  const processGradientMode = ({
    svgElement,
    doc,
    gradientStart,
    gradientEnd,
    nodeId,
    nodeType,
    strokeColor,
    isSelected,
    isDeveloperMode
  }) => {
    const gradientId = `customGradient-${nodeId}`;
    svgElement.setAttribute("id", `svg-node-${nodeType}`);

    const defs = createGradientDefinition(doc, gradientId, gradientStart, gradientEnd);
    svgElement.insertBefore(defs, svgElement.firstChild);

    applyGradientFill(svgElement, gradientId);
    applyStrokeStyles(svgElement, strokeColor, isSelected, isDeveloperMode, "#000000ff", "drop-shadow(0 0 1px rgba(211, 214, 218, 0.8))");
  };

  // Helper function to process solid color mode
  const processSolidColorMode = ({
    svgElement,
    fillColor,
    strokeColor,
    isSelected,
    isDeveloperMode
  }) => {
    if (!fillColor) return;
    
    applyFillColor(svgElement, fillColor);
    applyStrokeStyles(svgElement, strokeColor, isSelected, isDeveloperMode, variables.primary_gray_2, "drop-shadow(0 0 1px rgba(216, 219, 222, 0.8))");
  };

  const processSvg = ({
    svgText,
    fillColor,
    strokeColor,
    isHighlighted,
    useDefaultColors = false,
    gradientStart,
    gradientEnd,
    nodeId,
    nodeType,
    isSelected = false,
    isDeveloperMode = true
  }) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = doc.documentElement;

      setupSvgViewBox(svgElement);
      applyHighlightClass(svgElement, isHighlighted);
      applyInitialSelectedStrokeStyles(svgElement, isSelected, isDeveloperMode);

      if (gradientStart && gradientEnd) {
        processGradientMode({
          svgElement,
          doc,
          gradientStart,
          gradientEnd,
          nodeId,
          nodeType,
          strokeColor,
          isSelected,
          isDeveloperMode
        });
      } else {
        processSolidColorMode({
          svgElement,
          fillColor,
          strokeColor,
          isSelected,
          isDeveloperMode
        });
      }

      return svgElement.outerHTML;
    } catch (err) {
      console.error("Error processing SVG:", err);
      return svgText;
    }
  };

  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch(svgPath);
        let svgText = await response.text();
        svgText = processSvg({
          svgText,
          fillColor: nodeColor,
          strokeColor,
          isHighlighted,
          useDefaultColors: useDefaultSvgColors,
          gradientStart,
          gradientEnd,
          nodeId: id,
          nodeType,
          isSelected,
          isDeveloperMode
        });
        setSvgContent(svgText);
      } catch (error) {
        console.error("Error loading SVG:", error);
        setSvgContent(null);
      }
    };
    fetchSvg();
  }, [svgPath, isHighlighted, nodeColor, strokeColor, useDefaultSvgColors, gradientStart, gradientEnd, id, nodeType, isSelected, isDeveloperMode]);

  useEffect(() => {
    if (
      useDefaultSvgColors &&
      (nodeColor !== defaultNodeColor ||
        strokeColor !== defaultStrokeColor ||
        data.gradientStart ||
        data.gradientEnd)
    ) {
      setUseDefaultSvgColors(false);
    }
  }, [nodeColor, strokeColor, defaultNodeColor, defaultStrokeColor, data.gradientStart, data.gradientEnd]);
  // Only blink when not in developer mode
  const shouldApplyBlink = shouldBlink && !isDeveloperMode;

  const content = (
    <div 
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      {tag && (
        <div style={{ marginBottom: "8px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "regular", wordBreak: "break-word" }}>{tag}</p>
        </div>
      )}

      <SvgContent
        svgContent={svgContent}
        svgPath={svgPath}
        isHighlighted={isHighlighted}
        svgContainerRef={svgContainerRef}
        HandlesComponent={HandlesComponent}
        id={id}
        shouldApplyBlink={shouldApplyBlink}
      />

      {subTag && (
        <div style={{ marginTop: "8px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "regular", wordBreak: "break-word" }}>{subTag}</p>
        </div>
      )}
    </div>
  );

  // Only render tooltip wrapper in non-developer mode
  if (!isDeveloperMode) {
    return (
      <NodeTooltip>
        <NodeTooltipContent>
          <div>Bearing node</div>
        </NodeTooltipContent>
        {content}
      </NodeTooltip>
    );
  }

  return content;
};

export default SvgNode;


