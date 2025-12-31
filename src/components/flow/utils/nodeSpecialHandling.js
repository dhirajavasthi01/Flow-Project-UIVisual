/**
 * Utility functions for identifying nodes that require special color handling.
 * 
 * Special nodes are those that should preserve their original SVG colors
 * and not have colors extracted or overridden automatically.
 * 
 * This is determined dynamically by analyzing the SVG file itself,
 * using logic similar to extractColorsFromSvg, rather than using a hardcoded list.
 * 
 * NOTE: This file should be kept in sync with the corresponding file in Flow-Project
 */

/**
 * Analyzes SVG content (text) to determine if it should preserve its original colors.
 * Uses similar logic to extractColorsFromSvg to detect complex color schemes.
 * 
 * @param {string} svgText - The SVG content as text
 * @returns {boolean} - True if the SVG should preserve its original colors
 */
function analyzeSvgTextForSpecialHandling(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = doc.documentElement;

    // Check for complex gradient patterns that should be preserved
    const gradients = svgElement.querySelectorAll('linearGradient, radialGradient');
    
    if (gradients.length > 0) {
      // Check for gradients with same start/end colors (like RectangularTank)
      // These indicate a specific visual pattern that should be preserved
      for (const gradient of gradients) {
        const stops = Array.from(gradient.querySelectorAll('stop'));
        if (stops.length >= 3) {
          const getStopColor = (stop) => {
            let color = stop.getAttribute('stop-color');
            if (color) return color.trim();
            const style = stop.getAttribute('style');
            if (style) {
              const match = style.match(/stop-color:\s*([^;]+)/i);
              if (match) return match[1].trim();
            }
            return null;
          };

          const stopColors = stops.map(stop => getStopColor(stop)).filter(Boolean);
          if (stopColors.length >= 3) {
            const firstColor = stopColors[0]?.trim().toUpperCase();
            const lastColor = stopColors[stopColors.length - 1]?.trim().toUpperCase();
            
            // If first and last colors are the same, it's a symmetric gradient pattern
            // This is a characteristic of special nodes like RectangularTank
            if (firstColor && lastColor && firstColor === lastColor) {
              return true;
            }
          }
        }
      }
    }

    // Check for masks (complex SVG structures that should be preserved)
    // This should be checked early as masks indicate complex designs
    // First check for elements that use masks (mask attribute) - this is more reliable
    const elementsWithMask = svgElement.querySelectorAll('[mask]');
    if (elementsWithMask.length > 0) {
      return true;
    }
    
    // Also check for mask elements themselves (in case they exist but aren't used)
    // Use getElementsByTagNameNS for proper namespace handling
    const svgNS = 'http://www.w3.org/2000/svg';
    const maskElements = svgElement.getElementsByTagNameNS(svgNS, 'mask');
    if (maskElements.length > 0) {
      return true;
    }

    // Check for multiple distinct fill colors (complex color schemes)
    // Special nodes often have multiple colors that form a cohesive design
    // Include all elements with fill, even those that might use gradients or masks
    const allElements = svgElement.querySelectorAll('*');
    const uniqueFillColors = new Set();
    
    for (const el of allElements) {
      const fill = el.getAttribute('fill');
      if (fill && fill !== 'none' && !fill.startsWith('url(')) {
        // Normalize color values (handle hex, rgb, etc.)
        const normalizedColor = fill.trim().toUpperCase();
        if (normalizedColor && normalizedColor !== 'NONE') {
          uniqueFillColors.add(normalizedColor);
        }
      }
    }

    // Require 4 or more distinct fill colors to be considered special
    // This excludes simple icons with just a few colors (like GearBox with 3 colors)
    // Special nodes like Hopper2 have 4+ distinct colors forming complex designs
    if (uniqueFillColors.size >= 4) {
      return true;
    }

    // Default: not special
    return false;
  } catch (error) {
    console.error('Error analyzing SVG text for special handling:', error);
    return false;
  }
}

/**
 * Synchronous version that analyzes SVG text directly.
 * Use this when you already have the SVG content as text.
 * 
 * @param {string} svgText - The SVG content as text
 * @returns {boolean} - True if the SVG should preserve its original colors
 */
export function isSpecialNodeFromSvgText(svgText) {
  if (!svgText || typeof svgText !== 'string') {
    return false;
  }
  return analyzeSvgTextForSpecialHandling(svgText);
}
