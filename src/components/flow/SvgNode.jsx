import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";

import "react-tooltip/dist/react-tooltip.css";

import { variables } from "../../assets/Variables";
import {
  NodeTooltip,
  NodeTooltipContent,
  useNodeTooltip,
} from "./nodeTooltip/NodeTooltip";

import { Tooltip } from "react-tooltip";
import { isSpecialNodeFromSvgText } from "./utils/nodeSpecialHandling";

/* ----------------------------- SvgContent ----------------------------- */

const SvgContent = memo(
  ({
    svgContent,
    svgPath,
    isHighlighted,
    svgContainerRef,
    HandlesComponent,
    id,
    shouldApplyBlink,
  }) => {
    const tooltip = useNodeTooltip();

    const handleMouseEnter = useCallback(() => {
      tooltip?.showTooltip();
    }, [tooltip]);

    const handleMouseLeave = useCallback(() => {
      tooltip?.hideTooltip();
    }, [tooltip]);

    return (
      <div
        ref={svgContainerRef}
        data-tooltip-id={`tooltip-${id}`}
        className={shouldApplyBlink ? "node-blink" : ""}
        style={{
          position: "relative",
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {svgContent ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              pointerEvents: "none",
            }}
          />
        ) : (
          <img
            src={svgPath}
            alt="Node"
            className={isHighlighted ? "highlighted" : ""}
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              objectFit: "contain",
            }}
          />
        )}

        {HandlesComponent && (
          <HandlesComponent id={id} containerRef={svgContainerRef} />
        )}
      </div>
    );
  }
);

SvgContent.displayName = "SvgContent";

/* ------------------------------ SvgNode ------------------------------ */

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
    gradientStart,
    gradientEnd,
    tooltipContent,
    failureModeNames,
    ttfDays = null,
    shouldBlink = false,
  } = data;

  const failureModeList = failureModeNames?.length
    ? failureModeNames
    : null;

  const [rawSvgText, setRawSvgText] = useState(null);
  const [useDefaultSvgColors, setUseDefaultSvgColors] = useState(true);

  const svgContainerRef = useRef(null);

  const showTooltipContent = (content) =>
    content ? (
      <div className="p-[0_1vmin] text-center">
        <span className="text-14">{content}</span>
      </div>
    ) : null;

  /* ------------------------- SVG Helpers ------------------------- */

  const setupSvgViewBox = (svgElement) => {
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );

    tempSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    Object.assign(tempSvg.style, {
      position: "absolute",
      visibility: "hidden",
      width: "0",
      height: "0",
    });

    document.body.appendChild(tempSvg);

    Array.from(svgElement.childNodes).forEach((node) =>
      tempSvg.appendChild(node.cloneNode(true))
    );

    const bbox = tempSvg.getBBox();
    document.body.removeChild(tempSvg);

    const padding = 0.2;
    svgElement.setAttribute(
      "viewBox",
      `${bbox.x - padding} ${bbox.y - padding} ${
        bbox.width + 2 * padding
      } ${bbox.height + 2 * padding}`
    );
    svgElement.setAttribute("width", "100%");
    svgElement.setAttribute("height", "100%");
    svgElement.setAttribute("preserveAspectRatio", "none");
  };

  const applyHighlightClass = (svgElement, highlighted) => {
    if (!highlighted) return;
    const existing = svgElement.getAttribute("class") || "";
    svgElement.setAttribute(
      "class",
      `${existing} highlighted`.trim()
    );
  };

  const applyInitialSelectedStrokeStyles = (
    svgElement,
    selected,
    developerMode
  ) => {
    if (!selected || developerMode) return;

    svgElement.querySelectorAll("[stroke]").forEach((el) => {
      if (el.getAttribute("stroke") !== "none") {
        el.setAttribute("stroke-width", "1px");
        el.setAttribute("stroke", "#0066ff");
        el.style.filter =
          "drop-shadow(0 0 1px rgba(0, 102, 255, 0.8))";
      }
    });
  };

  const createGradientDefinition = (
    doc,
    gradientId,
    start,
    end
  ) => {
    const defs = doc.createElementNS(
      "http://www.w3.org/2000/svg",
      "defs"
    );
    const linearGrad = doc.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient"
    );

    linearGrad.setAttribute("id", gradientId);
    linearGrad.setAttribute("x1", "0%");
    linearGrad.setAttribute("y1", "0%");
    linearGrad.setAttribute("x2", "0%");
    linearGrad.setAttribute("y2", "100%");

    const createStop = (offset, color) => {
      const stop = doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "stop"
      );
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      return stop;
    };

    linearGrad.append(
      createStop("0%", start),
      createStop("50%", end),
      createStop("100%", start)
    );

    defs.appendChild(linearGrad);
    return defs;
  };

  const applyGradientFill = (svgElement, gradientId) => {
    svgElement.querySelectorAll("[fill]").forEach((el) => {
      if (el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", `url(#${gradientId})`);
      }
    });
  };

  const applyStrokeStyles = (
    svgElement,
    color,
    selected,
    developerMode,
    selectedColor,
    filter
  ) => {
    svgElement.querySelectorAll("[stroke]").forEach((el) => {
      if (el.getAttribute("stroke") === "none") return;

      el.setAttribute("stroke", color);
      el.setAttribute("stroke-width", "2");
      el.setAttribute("vector-effect", "non-scaling-stroke");

      if (selected && !developerMode) {
        el.setAttribute("stroke-width", "1px");
        el.setAttribute("stroke", selectedColor);
        el.style.filter = filter;
      }
    });
  };

  const applyFillColor = (svgElement, fillColor) => {
    if (!fillColor) return;

    svgElement.querySelectorAll("[fill]").forEach((el) => {
      if (el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", fillColor);
      }
    });
  };

  /* ------------------------- SVG Processing ------------------------- */

  const processSvg = ({
    svgText,
    fillColor,
    strokeColor,
    isHighlighted,
    gradientStart,
    gradientEnd,
    nodeId,
    nodeType,
    isSelected,
    isDeveloperMode,
  }) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        svgText,
        "image/svg+xml"
      );
      const svgElement = doc.documentElement;

      setupSvgViewBox(svgElement);
      applyHighlightClass(svgElement, isHighlighted);
      applyInitialSelectedStrokeStyles(
        svgElement,
        isSelected,
        isDeveloperMode
      );

      // Analyze the SVG text directly to determine if it should preserve original colors
      const isSpecial = isSpecialNodeFromSvgText(svgText);

      if (gradientStart && gradientEnd) {
        // Gradients are always applied regardless of isSpecial status
        const gradientId = `customGradient-${nodeId}`;
        svgElement.setAttribute("id", `svg-node-${nodeType}`);

        const defs = createGradientDefinition(
          doc,
          gradientId,
          gradientStart,
          gradientEnd
        );

        svgElement.insertBefore(defs, svgElement.firstChild);
        applyGradientFill(svgElement, gradientId);
      } else if (fillColor && !isSpecial) {
        // Only apply fill color if nodeColor exists and node is not special
        applyFillColor(svgElement, fillColor);
      }

      // Apply stroke styles - matches old logic: if !isSpecial || strokeColor
      // Use the helper function for consistency with the rest of the code
      if (!isSpecial || strokeColor) {
        applyStrokeStyles(
          svgElement,
          strokeColor || "#000000",
          isSelected,
          isDeveloperMode,
          variables.primary_gray_2,
          "drop-shadow(0 0 1px rgba(216, 219, 222, 0.8))"
        );
      }

      return svgElement.outerHTML;
    } catch (error) {
      console.error("Error processing SVG:", error);
      return svgText;
    }
  };

  /* --------------------------- Effects --------------------------- */

  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch(svgPath);
        setRawSvgText(await response.text());
      } catch (error) {
        console.error("Error loading SVG:", error);
        setRawSvgText(null);
      }
    };

    fetchSvg();
  }, [svgPath]);

  const svgContent = useMemo(() => {
    if (!rawSvgText) return null;

    return processSvg({
      svgText: rawSvgText,
      fillColor: nodeColor,
      strokeColor,
      isHighlighted,
      gradientStart,
      gradientEnd,
      nodeId: id,
      nodeType,
      isSelected,
      isDeveloperMode,
    });
  }, [
    rawSvgText,
    nodeColor,
    strokeColor,
    isHighlighted,
    gradientStart,
    gradientEnd,
    id,
    nodeType,
    isSelected,
    isDeveloperMode,
  ]);

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
  }, [
    nodeColor,
    strokeColor,
    defaultNodeColor,
    defaultStrokeColor,
    data.gradientStart,
    data.gradientEnd,
    useDefaultSvgColors,
  ]);

  const shouldApplyBlink = shouldBlink && !isDeveloperMode;

  /* ---------------------------- Render ---------------------------- */

  const content = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: failureModeList ? "pointer" : "default",
      }}
    >
      <SvgContent
        svgContent={svgContent}
        svgPath={svgPath}
        isHighlighted={isHighlighted}
        svgContainerRef={svgContainerRef}
        HandlesComponent={HandlesComponent}
        id={id}
        shouldApplyBlink={shouldApplyBlink}
      />

      {isDeveloperMode && (
        <Tooltip
          id={`tooltip-${id}`}
          style={{
            zIndex: 9999,
            maxWidth: "250px",
            whiteSpace: "pre-line",
          }}
          disableResizeObserver
          disableAutoUpdate
        >
          {showTooltipContent(tooltipContent)}
        </Tooltip>
      )}
    </div>
  );

  if (!isDeveloperMode) {
    return (
      <NodeTooltip nodeId={id}>
        <NodeTooltipContent id={id}>
          {failureModeList?.length ? (
            <div className="p-[.7vmin] flex flex-col uppercase">
              <div className="border-b-[.1vmin] border-b-primary_gray_2 text-center">
                <span className="text-12 font-sabic_text_bold">
                  {tooltipContent || "-"}
                </span>
              </div>

              <div className="flex flex-col uppercase">
                {ttfDays && (
                  <div className="flex text-13 pt-1 gap-1 items-start">
                    <div className="text-12 font-sabic_text_bold">
                      Estimated TTF :
                    </div>
                    <div>
                      {ttfDays} {ttfDays > 1 ? "Days" : "Day"}
                    </div>
                  </div>
                )}

                <div className="flex text-13 pt-[1vmin] gap-[1vmin] items-start">
                  <div className="text-12 font-sabic_text_bold">
                    Failure Mode
                    {failureModeList.length > 1 ? "s" : ""} :
                  </div>

                  <ul className="flex flex-col">
                    {failureModeList.map((item, index) => (
                      <li key={`${item}-flow`}>
                        {index + 1}. {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            showTooltipContent(tooltipContent)
          )}
        </NodeTooltipContent>

        {content}
      </NodeTooltip>
    );
  }

  return content;
};

export default SvgNode;
