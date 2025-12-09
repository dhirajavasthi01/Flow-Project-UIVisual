import { useState, useEffect, useRef, useCallback } from 'react';
import "react-tooltip/dist/react-tooltip.css";
import variables from '../../assets/Variables';
import { NodeTooltip, NodeTooltipContent, useNodeTooltip } from './nodeTooltip/nodeTooltip';


// Inner component that uses the tooltip hook directly - no wrapper affecting layout
const SvgContent = ({ svgContent, svgPath, isHighlighted, svgContainerRef, HandlesComponent, id, shouldApplyBlink }) => {
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
};

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

      if (isHighlighted) {
        const existingClass = svgElement.getAttribute("class") || "";
        svgElement.setAttribute("class", `${existingClass} ${"highlighted"}`.trim());
      }

      if (isSelected && !isDeveloperMode) {
        svgElement.querySelectorAll("[stroke]").forEach(el => {
          if (el.getAttribute("stroke") !== "none") {
            el.setAttribute("stroke-width", "1px");
            el.setAttribute("stroke", "#0066ff");
            el.style.filter = "drop-shadow(0 0 1px rgba(0, 102, 255, 0.8))";
          }
        });
      }

      if (gradientStart && gradientEnd) {
        const gradientId = `customGradient-${nodeId}`;
        svgElement.setAttribute("id", `svg-node-${nodeType}`);

        const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
        const linearGrad = doc.createElementNS("http://www.w3.org/2000/svg", "linearGradient");

        linearGrad.setAttribute("id", gradientId);
        linearGrad.setAttribute("x1", "0%");
        linearGrad.setAttribute("y1", "0%");
        linearGrad.setAttribute("x2", "0%");
        linearGrad.setAttribute("y2", "100%");

        const stop1 = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", gradientStart);
        linearGrad.appendChild(stop1);

        const stop2 = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "50%");
        stop2.setAttribute("stop-color", gradientEnd);
        linearGrad.appendChild(stop2);

        const stop3 = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop3.setAttribute("offset", "100%");
        stop3.setAttribute("stop-color", gradientStart);
        linearGrad.appendChild(stop3);

        defs.appendChild(linearGrad);
        svgElement.insertBefore(defs, svgElement.firstChild);

        svgElement.querySelectorAll("[fill]").forEach(el => {
          if (el.getAttribute("fill") !== "none")
            el.setAttribute("fill", `url(#${gradientId})`);
        });

        svgElement.querySelectorAll("[stroke]").forEach(el => {
          if (el.getAttribute("stroke") !== "none") {
            el.setAttribute("stroke", strokeColor);
            if (isSelected && !isDeveloperMode) {
              el.setAttribute("stroke-width", "1px");
              el.setAttribute("stroke", "#000000ff");
              el.style.filter = "drop-shadow(0 0 1px rgba(211, 214, 218, 0.8))";
            }
          }
        });
      } else {
        if (fillColor) {
          svgElement.querySelectorAll("[fill]").forEach(el => {
            if (el.getAttribute("fill") !== "none") el.setAttribute("fill", fillColor);
          });

          svgElement.querySelectorAll("[stroke]").forEach(el => {
            if (el.getAttribute("stroke") !== "none") {
              el.setAttribute("stroke", strokeColor);
              if (isSelected && !isDeveloperMode) {
                el.setAttribute("stroke-width", "1px");
                el.setAttribute("stroke", variables.primary_gray_2);
                el.style.filter = "drop-shadow(0 0 1px rgba(216, 219, 222, 0.8))";
              }
            }
          });
        }
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


