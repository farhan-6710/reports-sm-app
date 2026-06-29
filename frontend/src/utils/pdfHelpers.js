/**
 * PDF Generation Helper Utilities
 * Comprehensive text sanitization and data validation for professional PDF reports
 */

// ============================================================================
// TEXT SANITIZATION
// ============================================================================

/**
 * Enhanced text sanitization for PDF output
 * Handles HTML entities, special characters, and ensures clean text
 * @param {*} text - Input text (can be any type)
 * @param {string} fallback - Fallback value if text is invalid
 * @returns {string} - Sanitized text safe for PDF output
 */
export const sanitizeText = (text, fallback = '') => {
    // Handle null/undefined/non-string values
    if (text === null || text === undefined) return fallback;
    if (typeof text !== 'string') {
        // Convert numbers/booleans to string
        if (typeof text === 'number' || typeof text === 'boolean') {
            return String(text);
        }
        return fallback;
    }

    if (text.trim() === '') return fallback;

    try {
        // Step 1: Decode HTML entities using DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        let cleaned = tempDiv.textContent || tempDiv.innerText || text;

        // Step 2: Remove HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        // Step 3: Decode common HTML entities manually (in case DOM didn't catch them)
        cleaned = cleaned.replace(/&amp;/g, '&');
        cleaned = cleaned.replace(/&lt;/g, '<');
        cleaned = cleaned.replace(/&gt;/g, '>');
        cleaned = cleaned.replace(/&quot;/g, '"');
        cleaned = cleaned.replace(/&#39;/g, "'");
        cleaned = cleaned.replace(/&apos;/g, "'");
        cleaned = cleaned.replace(/&nbsp;/g, ' ');
        cleaned = cleaned.replace(/&mdash;/g, '—');
        cleaned = cleaned.replace(/&ndash;/g, '–');
        cleaned = cleaned.replace(/&hellip;/g, '…');

        // Step 4: Remove control characters (except newlines and tabs)
        cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

        // Step 5: Remove zero-width characters
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

        // Step 6: Normalize quotes and apostrophes
        cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
        cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');

        // Step 7: Normalize whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Step 8: Remove any remaining problematic characters
        cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');

        return cleaned || fallback;
    } catch (error) {
        console.error('Error sanitizing text:', error);
        return fallback;
    }
};

/**
 * Safe text wrapper for PDF output - ALWAYS sanitizes
 * Use this for ALL doc.text() calls
 * @param {*} text - Input text
 * @param {string} fallback - Fallback value
 * @returns {string} - Sanitized text
 */
export const safeText = (text, fallback = 'N/A') => {
    return sanitizeText(text, fallback);
};

/**
 * Sanitize array of strings (for table data)
 * @param {Array} arr - Array of values
 * @param {string} fallback - Fallback for empty values
 * @returns {Array} - Sanitized array
 */
export const sanitizeArray = (arr, fallback = 'N/A') => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => sanitizeText(item, fallback));
};

/**
 * Sanitize table data (2D array)
 * @param {Array<Array>} rows - Table rows
 * @param {string} fallback - Fallback for empty values
 * @returns {Array<Array>} - Sanitized table data
 */
export const sanitizeTableData = (rows, fallback = 'N/A') => {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => {
        if (!Array.isArray(row)) return [];
        return row.map(cell => sanitizeText(cell, fallback));
    });
};

// ============================================================================
// DATA VALIDATION & SAFE ACCESS
// ============================================================================

/**
 * Safely get a numeric value with fallback
 * @param {*} value - Input value
 * @param {number} fallback - Fallback value (default: 0)
 * @param {boolean} allowZero - Whether to allow 0 as valid value
 * @returns {number} - Safe numeric value
 */
export const safeNumber = (value, fallback = 0, allowZero = true) => {
    if (value === null || value === undefined || value === '') return fallback;

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) return fallback;
    if (!allowZero && num === 0) return fallback;

    return num;
};

/**
 * Safely get a string value with fallback
 * @param {*} value - Input value
 * @param {string} fallback - Fallback value (default: 'N/A')
 * @returns {string} - Safe string value
 */
export const safeString = (value, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') return fallback;
    return sanitizeText(String(value), fallback);
};

/**
 * Safely access nested object property
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} fallback - Fallback value
 * @returns {*} - Value or fallback
 */
export const safeGet = (obj, path, fallback = null) => {
    if (!obj || typeof obj !== 'object') return fallback;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
            return fallback;
        }
        result = result[key];
    }

    return result !== undefined && result !== null ? result : fallback;
};

/**
 * Safely get array with fallback
 * @param {*} value - Input value
 * @param {Array} fallback - Fallback array (default: [])
 * @returns {Array} - Safe array
 */
export const safeArray = (value, fallback = []) => {
    if (!Array.isArray(value)) return fallback;
    return value;
};

// ============================================================================
// FORMATTING HELPERS WITH SAFE DEFAULTS
// ============================================================================

/**
 * Format number with safe fallback
 * @param {*} num - Number to format
 * @param {string} fallback - Fallback value (default: '0')
 * @returns {string} - Formatted number
 */
export const formatNumber = (num, fallback = '0') => {
    const safeNum = safeNumber(num, null);
    if (safeNum === null) return fallback;
    return Math.round(safeNum).toLocaleString('en-US');
};

/**
 * Format percentage with safe fallback
 * @param {*} num - Number to format as percentage
 * @param {number} decimals - Decimal places (default: 1)
 * @param {string} fallback - Fallback value (default: '0.0%')
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (num, decimals = 1, fallback = '0.0%') => {
    const safeNum = safeNumber(num, null);
    if (safeNum === null) return fallback;
    return `${parseFloat(safeNum).toFixed(decimals)}%`;
};

/**
 * Format currency with safe fallback
 * @param {*} num - Number to format as currency
 * @param {string} currency - Currency symbol (default: '₹')
 * @param {string} fallback - Fallback value
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (num, currency = '₹', fallback = null) => {
    const safeNum = safeNumber(num, null);
    if (safeNum === null) return fallback || `${currency}0`;

    // For INR, use Indian number format
    if (currency === 'INR' || currency === '₹') {
        return `${currency}${Math.round(safeNum).toLocaleString('en-IN')}`;
    }
    return `${currency}${Math.round(safeNum).toLocaleString('en-US')}`;
};

/**
 * Format decimal with safe fallback
 * @param {*} num - Number to format
 * @param {number} decimals - Decimal places (default: 2)
 * @param {string} fallback - Fallback value (default: '0.00')
 * @returns {string} - Formatted decimal
 */
export const formatDecimal = (num, decimals = 2, fallback = '0.00') => {
    const safeNum = safeNumber(num, null);
    if (safeNum === null) return fallback;
    return parseFloat(safeNum).toFixed(decimals);
};

/**
 * Format date with safe fallback
 * @param {*} date - Date to format
 * @param {string} fallback - Fallback value (default: 'N/A')
 * @returns {string} - Formatted date
 */
export const formatDate = (date, fallback = 'N/A') => {
    if (!date) return fallback;

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return fallback;

        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return fallback;
    }
};

// ============================================================================
// VALUE FORMATTING WITH COMPREHENSIVE FALLBACKS
// ============================================================================

/**
 * Format any value intelligently based on type
 * @param {*} value - Value to format
 * @param {string} type - Type hint ('number', 'percentage', 'currency', 'date')
 * @param {*} fallback - Fallback value
 * @returns {string} - Formatted value
 */
export const formatValue = (value, type = 'auto', fallback = 'N/A') => {
    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    // Auto-detect type if not specified
    if (type === 'auto') {
        if (typeof value === 'number') {
            return formatNumber(value, fallback);
        }
        if (typeof value === 'string') {
            return sanitizeText(value, fallback);
        }
        if (value instanceof Date) {
            return formatDate(value, fallback);
        }
        return sanitizeText(String(value), fallback);
    }

    // Format based on specified type
    switch (type) {
        case 'number':
            return formatNumber(value, fallback);
        case 'percentage':
            return formatPercentage(value, 1, fallback);
        case 'currency':
            return formatCurrency(value, '₹', fallback);
        case 'decimal':
            return formatDecimal(value, 2, fallback);
        case 'date':
            return formatDate(value, fallback);
        default:
            return sanitizeText(String(value), fallback);
    }
};

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

/**
 * Validate and normalize post/content data
 * @param {Object} post - Post data
 * @returns {Object} - Normalized post data
 */
export const normalizePostData = (post) => {
    if (!post || typeof post !== 'object') {
        return {
            id: 'unknown',
            caption: 'N/A',
            likes: 0,
            comments: 0,
            views: 0,
            engagement: 0,
            impressions: 0,
            reach: 0,
            media_type: 'unknown',
            media_url: '',
            thumbnail_url: ''
        };
    }

    return {
        id: safeString(post.id || post.post_id, 'unknown'),
        caption: sanitizeText(post.caption || post.message || post.text, 'No caption'),
        likes: safeNumber(post.likes || post.like_count, 0),
        comments: safeNumber(post.comments || post.comments_count, 0),
        views: safeNumber(post.views || post.view_count || post.impressions, 0),
        engagement: safeNumber(post.engagement, 0),
        impressions: safeNumber(post.impressions, 0),
        reach: safeNumber(post.reach, 0),
        saved: safeNumber(post.saved, 0),
        shares: safeNumber(post.shares, 0),
        media_type: safeString(post.media_type || post.type, 'unknown'),
        media_url: safeString(post.media_url || post.image_url || post.thumbnail_url, ''),
        thumbnail_url: safeString(post.thumbnail_url || post.media_url || post.image_url, ''),
        timestamp: post.timestamp || post.created_time || post.date,
        engagement_rate: safeNumber(post.engagement_rate, 0)
    };
};

/**
 * Validate and normalize account data
 * @param {Object} account - Account data
 * @returns {Object} - Normalized account data
 */
export const normalizeAccountData = (account) => {
    if (!account || typeof account !== 'object') {
        return {
            id: 'unknown',
            account_name: 'Unknown Account',
            platform: 'unknown',
            followers: 0,
            following: 0,
            posts_count: 0
        };
    }

    return {
        id: safeString(account.id || account.account_id, 'unknown'),
        account_name: sanitizeText(account.account_name || account.name || account.username, 'Unknown Account'),
        platform: safeString(account.platform, 'unknown'),
        followers: safeNumber(account.followers || account.followers_count, 0),
        following: safeNumber(account.following || account.following_count, 0),
        posts_count: safeNumber(account.posts_count || account.media_count, 0),
        profile_picture: safeString(account.profile_picture || account.profile_picture_url, '')
    };
};

/**
 * Validate report data structure
 * @param {Object} report - Report data
 * @returns {boolean} - Whether report is valid
 */
export const isValidReport = (report) => {
    if (!report || typeof report !== 'object') return false;
    if (!report.type || !report.account) return false;
    if (!report.data || typeof report.data !== 'object') return false;
    return true;
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
    // Text sanitization
    sanitizeText,
    safeText,
    sanitizeArray,
    sanitizeTableData,

    // Data validation
    safeNumber,
    safeString,
    safeGet,
    safeArray,

    // Formatting
    formatNumber,
    formatPercentage,
    formatCurrency,
    formatDecimal,
    formatDate,
    formatValue,

    // Data normalization
    normalizePostData,
    normalizeAccountData,
    isValidReport
};
