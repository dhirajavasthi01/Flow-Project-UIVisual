import html2canvas from 'html2canvas';

/**
 * Compare values with a symbol operator
 * @param {string} symbol - Operator symbol ('&&', '||', etc.)
 * @param {*} value1 - First value
 * @param {*} value2 - Second value
 * @returns {boolean} - Comparison result
 */
export const CompareValuesWithSymbol = (symbol, value1, value2) => {
  switch (symbol) {
    case '&&':
      return value1 && value2;
    case '||':
      return value1 || value2;
    case '===':
      return value1 === value2;
    case '!==':
      return value1 !== value2;
    case '>':
      return value1 > value2;
    case '<':
      return value1 < value2;
    case '>=':
      return value1 >= value2;
    case '<=':
      return value1 <= value2;
    default:
      return false;
  }
};

/**
 * Get value based on condition
 * @param {boolean} condition - Condition to check
 * @param {*} trueValue - Value to return if condition is true
 * @param {*} falseValue - Value to return if condition is false
 * @returns {*} - Conditional value
 */
export const getValsBaseOnCondition = (condition, trueValue, falseValue = null) => {
  return condition ? trueValue : falseValue;
};

/**
 * Get file name from URL or title
 * @param {string} urlOrTitle - URL or title string
 * @param {string} extension - File extension (default: 'png')
 * @returns {string} - Formatted file name
 */
export const getFileNameFromUrl = (urlOrTitle, extension = 'png') => {
  if (!urlOrTitle) return `file.${extension}`;
  
  // Remove special characters and spaces
  const sanitized = urlOrTitle
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${sanitized || 'file'}.${extension}`;
};

/**
 * Get user info and time string
 * @param {string} timezone - Timezone string
 * @returns {string} - Formatted user info and time
 */
export const getUserInfoAndTime = (timezone = 'UTC') => {
  const now = new Date();
  const timeString = now.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  
  // You can extend this to get actual user info from your auth system
  const userInfo = 'User'; // Replace with actual user info
  
  return `${userInfo} - ${timeString}`;
};

/**
 * Capture PNG with header
 * @param {string} selector - CSS selector for element to capture
 * @param {string} filename - Output filename
 * @param {string} credits - Credits/header text
 * @param {string} title - Title text
 */
export const capturePngWithHeader = async (selector, filename, credits, title) => {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });

    // Create a new canvas with header
    const headerHeight = 40;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height + headerHeight;
    const ctx = finalCanvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Draw header
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Screenshot', 10, 20);
    ctx.font = '12px Arial';
    ctx.fillText(credits || '', 10, 35);

    // Draw the captured content below header
    ctx.drawImage(canvas, 0, headerHeight);

    // Convert to blob and download
    finalCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
};

