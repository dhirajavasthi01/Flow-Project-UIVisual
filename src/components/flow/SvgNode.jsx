import { useState, useEffect, useRef, useCallback, memo } from 'react';
import "react-tooltip/dist/react-tooltip.css";
import variables from '../../assets/Variables';
import { NodeTooltip, NodeTooltipContent, useNodeTooltip } from './nodeTooltip/nodeTooltip';

const SvgContent = memo(({ svgContent, svgPath, isHighlighted, svgContainerRef, HandlesComponent, id, shouldApplyBlink }) => {
  const tooltip = useNodeTooltip();
  const handleMouseEnter = useCallback(() => tooltip?.showTooltip(), [tooltip]);
  const handleMouseLeave = useCallback(() => tooltip?.hideTooltip(), [tooltip]);

  return (
    <div
      ref={svgContainerRef}
      data-tooltip-id={`tooltip-${id}`}
      className={shouldApplyBlink ? 'node-blink' : ''}
      style={{ 
        position: "relative", 
        width: "100%", 
        height: "100%", // Fill the flex-grow container
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {svgContent ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ 
            width: "100%", 
            height: "100%", 
            pointerEvents: "none", 
            display: "flex",
            // This ensures the SVG stretches to the very edges of the div
            alignItems: "stretch", 
            justifyContent: "stretch" 
          }}
        />
      ) : (
        <img
          src={svgPath}
          alt="Node"
          style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
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
  defaultStrokeColor = "#000000",
  HandlesComponent,
  isHighlighted = false,
  isSelected = false,
  isDeveloperMode = true,
  svgPath,
}) => {
  const { nodeColor, strokeColor = defaultStrokeColor, tag, subTag, gradientStart, gradientEnd, shouldBlink = false } = data;
  const [svgContent, setSvgContent] = useState(null);
  const svgContainerRef = useRef(null);

  // CRITICAL: This crops the SVG to its actual path boundaries
  const setupSvgViewBox = (svgElement) => {
    // 1. Temporary attach to DOM to get real measurements
    const svgClone = svgElement.cloneNode(true);
    svgClone.style.position = 'absolute';
    svgClone.style.visibility = 'hidden';
    document.body.appendChild(svgClone);
    
    try {
      const bbox = svgClone.getBBox();
      // 2. Set viewBox to exactly match the path dimensions (no padding)
      svgElement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    } catch (e) {
      // Fallback if BBox fails
      if (!svgElement.getAttribute("viewBox")) {
        const w = svgElement.getAttribute("width") || 100;
        const h = svgElement.getAttribute("height") || 100;
        svgElement.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      }
    }
    document.body.removeChild(svgClone);

    svgElement.removeAttribute("width");
    svgElement.removeAttribute("height");
    svgElement.style.width = "100%";
    svgElement.style.height = "100%";
    // 'none' forces the SVG to fill the container regardless of aspect ratio
    // If you want to keep shape, use 'xMidYMid meet'
    svgElement.setAttribute("preserveAspectRatio", "none"); 
  };

  const processSvg = ({ svgText, nodeType, gradientStart, gradientEnd, nodeId, isHighlighted, isSelected, isDeveloperMode }) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = doc.documentElement;
      setupSvgViewBox(svgElement);

      const name = nodeType?.toLowerCase() || "";
      const isSpecialNode = name.includes('gear') || name.includes('tank');
      const ns = "http://www.w3.org/2000/svg";

      if (gradientStart && gradientEnd) {
        const gradientId = `grad-${nodeId}`;
        const defs = doc.createElementNS(ns, "defs");
        const linearGrad = doc.createElementNS(ns, "linearGradient");
        linearGrad.setAttribute("id", gradientId);
        linearGrad.setAttribute("x1", "0%"); linearGrad.setAttribute("y1", "0%");
        linearGrad.setAttribute("x2", "0%"); linearGrad.setAttribute("y2", "100%");
        [{o: "0%", c: gradientStart}, {o: "50%", c: gradientEnd}, {o: "100%", c: gradientStart}].forEach(s => {
          const stop = doc.createElementNS(ns, "stop");
          stop.setAttribute("offset", s.o);
          stop.setAttribute("stop-color", s.c);
          linearGrad.appendChild(stop);
        });
        defs.appendChild(linearGrad);
        svgElement.insertBefore(defs, svgElement.firstChild);
        svgElement.querySelectorAll("[fill]").forEach(el => {
          if (el.getAttribute("fill") !== "none") el.setAttribute("fill", `url(#${gradientId})`);
        });
      } else if (nodeColor && !isSpecialNode) {
        svgElement.querySelectorAll("[fill]").forEach(el => {
          if (el.getAttribute("fill") !== "none") el.setAttribute("fill", nodeColor);
        });
      }

      svgElement.querySelectorAll("[stroke]").forEach(el => {
        if (el.getAttribute("stroke") === "none") return;
        if (!isSpecialNode || strokeColor) el.setAttribute("stroke", strokeColor || "#000000");
      });

      return new XMLSerializer().serializeToString(doc);
    } catch (err) { return svgText; }
  };

  useEffect(() => {
    let isMounted = true;
    fetch(svgPath).then(res => res.text()).then(svgTextRaw => {
      if (!isMounted) return;
      setSvgContent(processSvg({ svgText: svgTextRaw, nodeType, gradientStart, gradientEnd, nodeId: id, isHighlighted, isSelected, isDeveloperMode }));
    });
    return () => { isMounted = false; };
  }, [svgPath, isHighlighted, nodeColor, strokeColor, gradientStart, gradientEnd, id, isSelected, isDeveloperMode]);

  return (
    <div style={{ 
      width: "100%", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column"
    }}>
      {tag && (
        <div style={{ flexShrink: 0, fontSize: "14px", textAlign: "center", width: "100%" }}>
          {tag}
        </div>
      )}
      
      {/* This wrapper is the key. By using flex: 1 and minHeight: 0, 
          it consumes all available space without adding padding. 
      */}
      <div style={{ 
        flex: 1, 
        width: "100%", 
        minHeight: 0, 
        display: "flex",
        flexDirection: "column"
      }}>
        <SvgContent
          svgContent={svgContent}
          svgPath={svgPath}
          isHighlighted={isHighlighted}
          svgContainerRef={svgContainerRef}
          HandlesComponent={HandlesComponent}
          id={id}
          shouldApplyBlink={shouldBlink && !isDeveloperMode}
        />
      </div>

      {subTag && (
        <div style={{ flexShrink: 0, fontSize: "12px", color: "#666", textAlign: "center", width: "100%" }}>
          {subTag}
        </div>
      )}
    </div>
  );
};

export default SvgNode;