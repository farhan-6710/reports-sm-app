/**
 * Utility functions for cleaning and formatting text
 */

/**
 * Clean text by removing extra spaces, fixing encoding, and normalizing
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
export const cleanText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove extra whitespace (multiple spaces, tabs, newlines)
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Trim whitespace from start and end
  cleaned = cleaned.trim();
  
  // Remove zero-width characters and other invisible characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Fix common encoding issues (replace problematic characters)
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'"); // Smart quotes to regular quotes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes to regular quotes
  cleaned = cleaned.replace(/\u2013/g, '-'); // En dash to hyphen
  cleaned = cleaned.replace(/\u2014/g, '-'); // Em dash to hyphen
  
  return cleaned;
};

/**
 * Format number with proper display (0 vs N/A)
 * @param {number|string|null|undefined} value - Value to format
 * @param {boolean} showNA - Whether to show "N/A" for zero/null values
 * @returns {string} - Formatted value
 */
export const formatValue = (value, showNA = false) => {
  if (value === null || value === undefined || value === '') {
    return showNA ? 'N/A' : '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return showNA ? 'N/A' : '0';
  }
  
  if (numValue === 0 && showNA) {
    return 'N/A';
  }
  
  return numValue.toLocaleString();
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 60) => {
  if (!text || typeof text !== 'string') return 'No caption';
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + '...';
};






