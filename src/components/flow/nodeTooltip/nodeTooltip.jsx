import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { NodeToolbar } from "@xyflow/react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

// Global tooltip manager - module-level singleton to track active tooltip ID
// This ensures only one tooltip is visible at a time across all nodes
const globalTooltipManager = {
    activeTooltipId: null,
    listeners: new Set(),
    
    setActiveTooltip(nodeId) {
        this.activeTooltipId = nodeId;
        this.notifyListeners();
    },
    
    clearActiveTooltip() {
        this.activeTooltipId = null;
        this.notifyListeners();
    },
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },
    
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.activeTooltipId));
    }
};

// Local tooltip context for each tooltip instance
const TooltipContext = createContext(null);

// Export the context so components can use it directly
export const useNodeTooltip = () => {
    const context = useContext(TooltipContext);
    if (!context) {
        return null; // Return null instead of throwing error for optional usage
    }
    return context;
};

export function NodeTooltip({ children, nodeId }) {
    const [activeTooltipId, setActiveTooltipId] = useState(globalTooltipManager.activeTooltipId);
    
    // Subscribe to global tooltip manager changes
    useEffect(() => {
        const unsubscribe = globalTooltipManager.subscribe((newActiveId) => {
            setActiveTooltipId(newActiveId);
        });
        return unsubscribe;
    }, []);

    // Determine visibility based on whether this node's tooltip is active
    const isVisible = activeTooltipId === nodeId;

    const showTooltip = useCallback(() => {
        globalTooltipManager.setActiveTooltip(nodeId);
    }, [nodeId]);

    const hideTooltip = useCallback(() => {
        globalTooltipManager.clearActiveTooltip();
    }, []);

    return (
        <TooltipContext.Provider value={{ isVisible, showTooltip, hideTooltip }}>
            <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>{children}</div>
        </TooltipContext.Provider>
    );
}

export function NodeTooltipTrigger(props) {
    const tooltipContext = useContext(TooltipContext);

    if (!tooltipContext) {
        throw new Error("NodeTooltipTrigger must be used within NodeTooltip");
    }

    const { showTooltip, hideTooltip } = tooltipContext;

    const onMouseEnter = useCallback(
        (e) => {
            props.onMouseEnter?.(e);
            showTooltip();
        },
        [props, showTooltip]
    );

    const onMouseLeave = useCallback(
        (e) => {
            props.onMouseLeave?.(e);
            hideTooltip();
        },
        [props, hideTooltip]
    );

    const { style, overlay, ...restProps } = props;
    
    // If overlay mode, use absolute positioning without flex
    const defaultStyle = overlay 
        ? { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", pointerEvents: "auto", zIndex: 1 }
        : { width: "100%", height: "100%", flex: 1, minHeight: 0, minWidth: 0 };
    
    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{ ...defaultStyle, ...style }}
            {...restProps}
        />
    );
}

export function NodeTooltipContent({ children, position, className, ...props }) {
    const tooltipContext = useContext(TooltipContext);

    function cn(...inputs) {
        return twMerge(clsx(inputs));
    }

    if (!tooltipContext) {
        throw new Error("NodeTooltipContent must be used within NodeTooltip");
    }

    const { isVisible } = tooltipContext;

    return (
        <div>
            <NodeToolbar
                isVisible={isVisible}
                className={cn(
                    "bg-primary_gray text-primary_white rounded-[.3vmin] z-999",
                    className
                )}
                tabIndex={1}
                position={position}
                {...props}
            >
                {children}
            </NodeToolbar>
        </div>
    );
}


