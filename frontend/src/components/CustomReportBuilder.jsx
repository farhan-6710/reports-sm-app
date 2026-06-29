import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import {
  PictureAsPdf,
  Instagram,
  Facebook,
  Campaign as CampaignIcon,
  TableChart,
  Assessment,
  GetApp,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { accountsAPI, reportsAPI } from '../services/api';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// ENHANCED TEXT SANITIZATION & DATA VALIDATION
// ============================================================================

/**
 * Enhanced text sanitization for PDF output
 * Handles HTML entities, special characters, and ensures clean text
 * @param {*} text - Input text (can be any type)
 * @param {string} fallback - Fallback value if text is invalid
 * @returns {string} - Sanitized text safe for PDF output
 */
const sanitizeText = (text, fallback = '', asciiOnly = false) => {
  if (text === null || text === undefined) return fallback;
  if (typeof text !== 'string') {
    if (typeof text === 'number' || typeof text === 'boolean') return String(text);
    return fallback;
  }

  if (text.trim() === '') return fallback;

  try {
    let cleaned = text.replace(/<[^>]*>/g, '');

    // Character-by-character filter for maximum safety (prevents UTF-16 artifacts)
    if (asciiOnly) {
      // Advanced ASCII-only sanitization
      // 1. Convert common smart quotes/dashes to ASCII
      cleaned = cleaned
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\u2022/g, '-') // Replace bullet with hyphen
        .replace(/\u2192/g, '->') // Replace arrows
        .replace(/\u2713/g, '[OK]') // Replace checkmark
        .replace(/\u26A0/g, '[!]'); // Replace warning

      // 2. Remove all remaining non-ASCII characters
      let result = '';
      for (let i = 0; i < cleaned.length; i++) {
        const code = cleaned.charCodeAt(i);
        if (code >= 32 && code <= 126) {
          result += cleaned[i];
        }
      }
      return result || fallback;
    }

    // Normal cleaning for body text
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '');

    // STRICT FILTER: Remove ALL non-ASCII characters and certain symbols that cause PDF artifacts
    cleaned = cleaned.replace(/[^\x20-\x7E]/g, ' ');

    // REMOVE INTERSPERSED AMPERSANDS (Shadowing Artifacts like &l&o&n&g&e&r&)
    // This is a common relic if encoding/decoding fails between platform/DB/frontend
    cleaned = cleaned.replace(/&([a-zA-Z])/g, '$1').replace(/([a-zA-Z])&/g, '$1');

    // Remove common HTML entities if they leaked through
    cleaned = cleaned.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // Remove multiple spaces caused by replacements
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim() || fallback;
  } catch (error) {
    console.error('Error sanitizing text:', error);
    return fallback;
  }
};

/**
 * Safe text wrapper for PDF output - ALWAYS sanitizes
 * Use this for ALL doc.text() calls
 */
const safeText = (text, fallback = 'N/A', asciiOnly = false) => {
  return sanitizeText(text, fallback, asciiOnly);
};

/**
 * Safely get a numeric value with fallback
 */
const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  return num;
};

/**
 * Safely get a string value with fallback
 */
const safeString = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return sanitizeText(String(value), fallback);
};

// Professional Color System
const COLORS = {
  primary: [255, 255, 255],      // Background
  accent: [255, 108, 4],         // Orange (Numeric Emphasis ONLY)
  secondary: [0, 133, 149],      // Teal (Section Headers ONLY)
  success: [16, 185, 129],       // Green (Positive Verdicts ONLY)
  error: [239, 68, 68],          // Red (Critical Only)
  warning: [245, 158, 11],       // Amber (Warnings)
  text: {
    primary: [44, 62, 80],        // Deep Grey
    secondary: [100, 116, 139],   // Soft Slate (Body)
    light: [148, 163, 184],       // Light Grey (Labels)
  },
  bg: {
    light: [248, 250, 252],      // Off-white surface
    card: [255, 255, 255],
  }
};

// Global Layout & Typography Tokens
const SAFE_MARGINS = {
  top: 60,      // Increased for breathability
  bottom: 48,   // FIXED: Enforce minimum 48px bottom margin (User Feedback)
  left: 20,
  right: 20,
};

const TYPOGRAPHY = {
  h1: { size: 18, style: 'bold' },
  h2: { size: 14, style: 'bold' },
  h3: { size: 11, style: 'bold' },
  body: { size: 10, style: 'normal' },
  caption: { size: 8, style: 'normal' },
  lineHeight: 1.4
};

// ============================================================================
// DYNAMIC LAYOUT HELPERS
// ============================================================================

/**
 * Checks if height fits on page; if not, triggers page break and returns reset yPos
 */
const ensureSpace = (doc, y, heightNeeded, pageHeight, accountName, color) => {
  if (y + heightNeeded > pageHeight - SAFE_MARGINS.bottom) {
    doc.addPage();
    drawSectionHeader(doc, accountName + ' (continued)', color);
    return SAFE_MARGINS.top;
  }
  return y;
};

/**
 * Draws wrapped text respecting margins and returns next Y position
 */
const drawWrappedText = (doc, text, x, y, maxWidth, options = {}) => {
  const {
    fontSize = TYPOGRAPHY.body.size,
    style = TYPOGRAPHY.body.style,
    color = COLORS.text.primary,
    align = 'left'
  } = options;

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', style);
  doc.setTextColor(...color);

  const lines = doc.splitTextToSize(safeText(text), maxWidth);
  doc.text(lines, x, y, { align });

  // Calculate height in mm: (fontSize in pt * 0.3527) * lines * lineHeight
  const height = (fontSize * 0.3527) * lines.length * TYPOGRAPHY.lineHeight;
  return y + height;
};

// ============================================================================
// ENHANCED FORMATTING HELPERS WITH SAFE DEFAULTS
// ============================================================================

/**
 * Format number with safe fallback
 */
const formatNumber = (num, fallback = '0') => {
  const safeNum = safeNumber(num, null);
  if (safeNum === null) return fallback;
  return Math.round(safeNum).toLocaleString('en-US');
};

/**
 * Format percentage with safe fallback
 */
const formatPercentage = (num, decimals = 1, fallback = '0.0%') => {
  const safeNum = safeNumber(num, null);
  if (safeNum === null) return fallback;
  return `${parseFloat(safeNum).toFixed(decimals)}%`;
};

/**
 * Format currency with safe fallback
 */
const formatCurrency = (num, currency = '₹', decimals = 0, fallback = null) => {
  const safeNum = safeNumber(num, null);
  if (safeNum === null) return fallback || `${currency}0`;

  const options = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };

  // For INR, use Indian number format
  if (currency === 'INR' || currency === '₹') {
    return `${currency}${safeNum.toLocaleString('en-IN', options)}`;
  }
  return `${currency}${safeNum.toLocaleString('en-US', options)}`;
};

/**
 * Format decimal with safe fallback
 */
const formatDecimal = (num, decimals = 2, fallback = '0.00') => {
  const safeNum = safeNumber(num, null);
  if (safeNum === null) return fallback;
  return parseFloat(safeNum).toFixed(decimals);
};

/**
 * Format any value intelligently based on type
 */
const formatValue = (value, type = 'auto', fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  switch (type) {
    case 'number':
      return formatNumber(value, fallback);
    case 'percentage':
      return formatPercentage(value, 1, fallback);
    case 'currency':
      return formatCurrency(value, '₹', fallback);
    case 'decimal':
      return formatDecimal(value, 2, fallback);
    default:
      if (typeof value === 'number') return formatNumber(value, fallback);
      return sanitizeText(String(value), fallback);
  }
};

// Helper function to draw subsection header (Clean, bold text only)
const drawSubsectionHeader = (doc, text, y, color = COLORS.text.primary) => {
  try {
    doc.setFontSize(TYPOGRAPHY.h2.size);
    doc.setFont('helvetica', TYPOGRAPHY.h2.style);
    doc.setTextColor(...color);
    doc.text(safeText(text).toUpperCase(), SAFE_MARGINS.left, y);
    return y + (TYPOGRAPHY.h2.size * 0.3527 * TYPOGRAPHY.lineHeight);
  } catch (e) {
    console.error('Error drawing subsection header:', e);
    return y;
  }
};

// Helper function to draw card title (Consistent H3)
const drawCardTitle = (doc, text, x, y) => {
  try {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text.primary);
    doc.text(safeText(text, 'Section'), x, y);
  } catch (e) {
    console.error('Error drawing card title:', e);
  }
};

/**
 * NEW: Global Decision-Analytics Headers & Metrics
 */
const drawSectionHeader = (doc, text, color = COLORS.secondary) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const topHeight = 40;
  doc.setFillColor(...color);
  doc.rect(0, 0, pageWidth, topHeight, 'F');

  doc.setFontSize(TYPOGRAPHY.h1.size);
  doc.setFont('helvetica', TYPOGRAPHY.h1.style);
  doc.setTextColor(255, 255, 255);
  // Center the header text horizontally (User Feedback)
  doc.text(safeText(text, 'Section', true), pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(TYPOGRAPHY.caption.size);
  doc.setFont('helvetica', TYPOGRAPHY.caption.style);
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - SAFE_MARGINS.right - 10, 25);
};

const drawImpactMetric = (doc, x, y, label, value, color = COLORS.secondary) => {
  // Suppression: Don't show zero metrics unless they are integers/decimals > 0
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(numericValue) || numericValue === 0) return;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text.light);
  doc.text(label.toUpperCase(), x, y);

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(value, x, y + 10);
};

// Helper function to draw simple bar chart - Module level
const drawSimpleBarChart = (doc, x, y, width, height, data, options = {}) => {
  try {
    const { maxValue, colors = [COLORS.secondary, COLORS.accent, COLORS.success] } = options;
    const barSpacing = 5;
    const barCount = data.length;
    const availableWidth = width - (barSpacing * (barCount - 1));
    const barWidth = availableWidth / barCount;
    const maxBarHeight = height - 20; // Leave space for labels

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0;
      const barX = x + (index * (barWidth + barSpacing));
      const barY = y + maxBarHeight - barHeight;
      const color = colors[index % colors.length];

      // Bar
      doc.setFillColor(...color);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      // Value label on top (using safe number and text)
      if (barHeight > 5) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text.primary);
        doc.text(safeText(formatNumber(item.value)), barX + barWidth / 2, barY - 2, { align: 'center' });
      }

      // Category label below (Standardized 10pt/7pt as needed - using 8pt here for charts)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text.secondary);
      const categoryLabel = safeText(item.label, 'Category');
      const labelLines = doc.splitTextToSize(categoryLabel, barWidth);
      doc.text(labelLines, barX + barWidth / 2, y + maxBarHeight + 5, { align: 'center' });
    });

    // Draw axis line
    doc.setDrawColor(...COLORS.text.light);
    doc.setLineWidth(0.2);
    doc.line(x, y + maxBarHeight, x + width, y + maxBarHeight);

    return y + height;
  } catch (e) {
    console.error('Error drawing bar chart:', e);
    return y;
  }
};

// Helper function to draw professional table - Clean & Insight-Focused
const drawProfessionalTable = (doc, startY, headers, rows, options = {}) => {
  const {
    headerColor = COLORS.secondary,
    alternateRowColor = [252, 253, 254],
    textColor = COLORS.text.primary,
    fontSize = 8,
    cellPadding = 4,
    highlightIndex = -1, // New: Support column highlighting
  } = options;

  const sanitizedHeaders = (headers || []).map(h => safeText(h, 'Metric'));
  const sanitizedRows = (rows || []).map(row =>
    (row || []).map(cell => safeText(cell, 'N/A'))
  );

  autoTable(doc, {
    startY: startY,
    head: [sanitizedHeaders],
    body: sanitizedRows,
    theme: 'striped',
    styles: {
      fontSize: fontSize, // Body rows normal
      cellPadding: cellPadding,
      textColor: textColor,
      lineColor: [230, 235, 240],
      lineWidth: 0.1,
      valign: 'middle'
    },
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: fontSize + 1, // Header row +1 size (Issue 2)
      cellPadding: 6,         // More breathing room
      valign: 'middle'
    },
    columnStyles: {
      [highlightIndex]: { fontStyle: 'bold', textColor: COLORS.accent },
    },
    alternateRowStyles: {
      fillColor: alternateRowColor,
    },
    margin: { left: 20, right: 20 },
    didParseCell: function (data) {
      // Right align numeric columns (Issue 2)
      // Heuristic: If header contains %, Rate, Views, Likes, Engagement, Reach
      const header = data.column.raw;
      if (typeof header === 'string') {
        const h = header.toLowerCase();
        if (h.includes('rate') || h.includes('%') || h.includes('views') || h.includes('likes') || h.includes('reach') || h.includes('engagement')) {
          data.cell.styles.halign = 'right';
        }
      }
    }
  });

  // Add Footnote support (Issue 2)
  if (options.footnote) {
    const finalY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text.light);
    doc.setFont('helvetica', 'italic');
    doc.text(options.footnote, 20, finalY);
    return finalY + 8;
  }

  return doc.lastAutoTable.finalY + 12;
};

const CustomReportBuilder = () => {
  const [accounts, setAccounts] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedAdAccounts, setSelectedAdAccounts] = useState([]);
  const [selectedReportTypes, setSelectedReportTypes] = useState({
    organic: false,
    content_performance: false,
    campaigns: false,
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  useEffect(() => {
    fetchAccounts();
    fetchAdAccounts();
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      // Filter out Facebook accounts - only show Instagram and other platforms
      const filteredAccounts = (response.data.data || []).filter(
        account => account.platform !== 'facebook'
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ad_accounts.php`);
      if (response.data.success) {
        setAdAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleAdAccountToggle = (adAccountId) => {
    setSelectedAdAccounts(prev => {
      if (prev.includes(adAccountId)) {
        return prev.filter(id => id !== adAccountId);
      } else {
        return [...prev, adAccountId];
      }
    });
  };

  const handleReportTypeToggle = (type) => {
    setSelectedReportTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const fetchOrganicReport = async (account) => {
    try {
      console.log(`Fetching organic report for ${account.account_name} (ID: ${account.id})`);
      // Use unified organic report endpoint for better data
      const response = await reportsAPI.getUnifiedOrganic(
        account.id,
        startDate,
        endDate,
        { includePosts: true, includeStories: true, postsLimit: 25 }
      );

      console.log(`Organic report response for ${account.account_name}:`, {
        hasResponse: !!response,
        hasData: !!response?.data,
        success: response?.data?.success,
        hasReportData: !!response?.data?.data,
        accountStats: response?.data?.data?.account_stats,
        engagement: response?.data?.data?.engagement
      });

      // Check response structure - API returns { success: true, data: {...} }
      const responseData = response?.data || response;

      // Validate response structure
      if (!responseData) {
        throw new Error(`No response data received for ${account.account_name}`);
      }

      // Check if response indicates success
      if (responseData.success === false) {
        const errorMsg = responseData.error || 'Unknown error';
        console.error(`Organic report API error for ${account.account_name}:`, errorMsg);
        throw new Error(`Organic Report API Error: ${errorMsg}`);
      }

      // Get the actual report data - it's nested in responseData.data
      const reportData = responseData.data;

      // Validate we have at least some data - but be more lenient
      if (!reportData) {
        console.error(`Organic report for ${account.account_name} returned no data object`);
        console.error('Full response:', JSON.stringify(responseData, null, 2));
        throw new Error(`No data object returned for ${account.account_name}. Check if account has valid access token and permissions.`);
      }

      // Check if we have minimal required data - if not, still proceed but with defaults
      if (!reportData.account_stats && !reportData.engagement && !reportData.content_posts) {
        console.warn(`Organic report for ${account.account_name} returned empty data structure`);
        console.warn('Report data keys:', Object.keys(reportData));
        // Don't throw - proceed with empty data structure
      }

      // Transform unified report structure to expected format
      // Use defaults if data is missing - don't fail completely
      const accountStats = reportData.account_stats || {};
      const engagement = reportData.engagement || {};
      const contentPosts = Array.isArray(reportData.content_posts) ? reportData.content_posts : [];
      const stories = reportData.stories || {};

      // Helper function to safely get numeric value or null
      const getNumericValue = (value, allowZero = true) => {
        if (value === null || value === undefined || value === '') return null;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return null;
        return allowZero || num > 0 ? num : null;
      };

      // Ensure posts have proper image URLs
      const processedPosts = contentPosts.map(post => ({
        ...post,
        thumbnail_url: post.thumbnail_url || post.media_url || post.image_url || '',
        media_url: post.media_url || post.thumbnail_url || post.image_url || '',
        // Ensure all numeric fields are properly set
        likes: getNumericValue(post.likes || post.like_count, true) ?? 0,
        comments: getNumericValue(post.comments || post.comments_count, true) ?? 0,
        views: getNumericValue(post.views || post.view_count, true) ?? 0,
        engagement: getNumericValue(post.engagement, true) ?? 0,
        impressions: getNumericValue(post.impressions, true) ?? 0,
        reach: getNumericValue(post.reach, true) ?? 0
      }));

      const organicData = {
        followers: getNumericValue(accountStats.followers || accountStats.followers_count, true) ?? 0,
        following: getNumericValue(accountStats.following, true) ?? 0,
        posts: getNumericValue(accountStats.posts_count || accountStats.media_count, true) ?? processedPosts.length,
        posts_count: getNumericValue(accountStats.posts_count || accountStats.media_count, true) ?? processedPosts.length,
        total_engagement: getNumericValue(engagement.total_engagement, true) ??
          (getNumericValue(engagement.likes || engagement.total_likes, true) ?? 0) +
          (getNumericValue(engagement.comments || engagement.total_comments, true) ?? 0),
        total_likes: getNumericValue(engagement.likes || engagement.total_likes, true) ?? 0,
        total_comments: getNumericValue(engagement.comments || engagement.total_comments, true) ?? 0,
        total_views: getNumericValue(engagement.views || engagement.total_views || engagement.impressions, true) ?? 0,
        impressions: getNumericValue(engagement.impressions, true) ?? 0,
        reach: getNumericValue(engagement.reach, true) ?? 0,
        new_followers: getNumericValue(reportData.growth?.new_followers || accountStats.new_followers, false),
        photos_count: getNumericValue(accountStats.photos_count, true) ?? 0,
        videos_count: getNumericValue(accountStats.videos_count, true) ?? 0,
        reels_count: getNumericValue(accountStats.reels_count, true) ?? 0,
        stories_count: getNumericValue(accountStats.stories_count || stories.total_posted, true) ?? 0,
        top_posts: processedPosts.slice(0, 5).map(post => ({
          ...post,
          thumbnail_url: post.thumbnail_url || post.media_url || '',
          media_url: post.media_url || post.thumbnail_url || ''
        })),
        top_stories: (Array.isArray(stories.stories_list) ? stories.stories_list : []).slice(0, 5).map(story => ({
          ...story,
          thumbnail_url: story.thumbnail_url || story.media_url || '',
          media_url: story.media_url || story.thumbnail_url || ''
        }))
      };

      console.log(`✅ Organic data transformed for ${account.account_name}:`, {
        followers: organicData.followers,
        posts: organicData.posts,
        total_engagement: organicData.total_engagement
      });

      return {
        type: 'organic',
        account: account,
        data: {
          organic: organicData
        },
        dates: reportData.date_range || { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error(`Error fetching organic report for ${account.account_name}:`, error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        throw new Error(`Organic Report API Error: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error(`Organic Report Network Error: No response from server`);
      } else {
        throw new Error(`Organic Report Error: ${error.message}`);
      }
    }
  };

  const fetchContentPerformanceReport = async (account) => {
    try {
      console.log(`Fetching content performance for account ${account.account_name} (ID: ${account.id})`);
      const response = await axios.post(`${API_BASE_URL}/api/posts_report.php`, {
        accountId: account.id,
        startDate: startDate,
        endDate: endDate,
        limit: 50
      }, {
        timeout: 180000 // Increased timeout to 3 minutes
      });

      console.log(`Content performance response for ${account.account_name}:`, {
        success: response.data?.success,
        hasData: !!response.data?.data,
        postsCount: response.data?.data?.total_posts,
        storiesCount: response.data?.data?.total_stories
      });

      // Check if response exists
      if (!response || !response.data) {
        console.error(`Content performance: No response received for ${account.account_name}`);
        throw new Error(`Content Performance Network Error: No response from server`);
      }

      // Check if response indicates success
      if (response.data.success === false) {
        const errorMsg = response.data?.error || 'Unknown error';
        console.error(`Content performance API error for ${account.account_name}:`, errorMsg);
        throw new Error(`Content Performance API Error: ${errorMsg}`);
      }

      // Check if response indicates success
      if (response.data && response.data.success) {
        // Ensure data structure is valid
        if (!response.data.data) {
          console.error(`Content performance report for ${account.account_name} returned no data`);
          console.error('Full response:', JSON.stringify(response.data, null, 2));
          throw new Error(`No data returned for ${account.account_name}. Check if account has valid access token and permissions.`);
        }

        // Validate that we have at least posts or stories - but don't fail if empty
        if (!response.data.data.posts && !response.data.data.stories) {
          console.warn(`Content performance report for ${account.account_name} has no posts or stories`);
          // Still return it with empty arrays
          if (!response.data.data.posts) response.data.data.posts = [];
          if (!response.data.data.stories) response.data.data.stories = [];
        }

        // Process and normalize posts data
        const processedPosts = (response.data.data.posts || []).map(post => {
          const likes = typeof post.likes === 'number' ? post.likes : (parseInt(post.like_count || post.likes || 0) || 0);
          const comments = typeof post.comments === 'number' ? post.comments : (parseInt(post.comments_count || post.comments || 0) || 0);
          const impressions = typeof post.impressions === 'number' ? post.impressions : (parseInt(post.impressions || 0) || 0);
          const reach = typeof post.reach === 'number' ? post.reach : (parseInt(post.reach || 0) || 0);

          // Image posts often don't have "views" but have "impressions"
          // If views is 0 or missing, fallback to impressions for images
          const mediaType = (post.media_type || 'IMAGE').toUpperCase();
          let views = typeof post.views === 'number' ? post.views : (parseInt(post.view_count || post.views || 0) || 0);

          if (views <= 0 && (mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM')) {
            views = impressions > 0 ? impressions : reach;
          }

          return {
            ...post,
            thumbnail_url: post.thumbnail_url || post.media_url || post.image_url || '',
            media_url: post.media_url || post.thumbnail_url || post.image_url || '',
            likes,
            comments,
            views,
            engagement: typeof post.engagement === 'number' ? post.engagement : (likes + comments),
            impressions,
            reach,
            saved: typeof post.saved === 'number' ? post.saved : (parseInt(post.saved || 0) || 0),
            shares: typeof post.shares === 'number' ? post.shares : (parseInt(post.shares || 0) || 0)
          };
        });

        // Process and normalize stories data
        const processedStories = (response.data.data.stories || []).map(story => ({
          ...story,
          // Ensure image URLs are properly set
          thumbnail_url: story.thumbnail_url || story.media_url || story.image_url || '',
          media_url: story.media_url || story.thumbnail_url || story.image_url || '',
          // Normalize numeric values
          impressions: typeof story.impressions === 'number' ? story.impressions : (parseInt(story.impressions || 0) || 0),
          reach: typeof story.reach === 'number' ? story.reach : (parseInt(story.reach || 0) || 0),
          replies: typeof story.replies === 'number' ? story.replies : (parseInt(story.replies || 0) || 0),
          taps_forward: typeof story.taps_forward === 'number' ? story.taps_forward : (parseInt(story.taps_forward || 0) || 0),
          taps_back: typeof story.taps_back === 'number' ? story.taps_back : (parseInt(story.taps_back || 0) || 0),
          exits: typeof story.exits === 'number' ? story.exits : (parseInt(story.exits || 0) || 0),
          link_clicks: typeof story.link_clicks === 'number' ? story.link_clicks : (parseInt(story.link_clicks || 0) || 0)
        }));

        return {
          type: 'content_performance',
          account: account,
          data: {
            ...response.data.data,
            posts: processedPosts,
            stories: processedStories,
            total_posts: processedPosts.length,
            total_stories: processedStories.length
          }
        };
      } else {
        const errorMsg = response.data?.error || 'Unknown error';
        console.error(`Content performance report for ${account.account_name} failed:`, errorMsg);
        console.error('Full response:', JSON.stringify(response.data, null, 2));
        throw new Error(`Content Performance API Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Error fetching content performance report for ${account.account_name}:`, error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        throw new Error(`Content Performance API Error: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error(`Content Performance Network Error: No response from server`);
      } else {
        throw new Error(`Content Performance Error: ${error.message}`);
      }
    }
  };

  const fetchCampaignReportFromAdAccount = async (adAccount) => {
    try {
      console.log(`Fetching campaign report for ${adAccount.client_name || adAccount.account_name}...`);
      console.log('Campaign request params:', {
        adAccountId: adAccount.ad_account_id,
        hasAccessToken: !!adAccount.access_token,
        tokenLength: adAccount.access_token?.length,
        startDate: startDate,
        endDate: endDate
      });

      const response = await axios.post(`${API_BASE_URL}/api/campaign_report.php`, {
        adAccountId: adAccount.ad_account_id,
        accessToken: adAccount.access_token,
        startDate: startDate,
        endDate: endDate,
        accountDbId: adAccount.id
      }, {
        timeout: 120000
      });

      console.log(`Campaign report response for ${adAccount.client_name || adAccount.account_name}:`, {
        success: response.data?.success,
        hasData: !!response.data?.data,
        error: response.data?.error
      });

      if (response.data && response.data.success) {
        // Ensure data structure is valid
        if (!response.data.data) {
          const errorMsg = `Campaign report for ${adAccount.client_name || adAccount.account_name} returned no data`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        return {
          type: 'campaigns',
          account: {
            account_name: adAccount.client_name || adAccount.account_name || adAccount.ad_account_id,
            platform: 'campaigns',
            account_id: adAccount.ad_account_id
          },
          data: response.data.data
        };
      } else {
        const errorMsg = response.data?.error || 'Unknown error from campaign API';
        console.error(`Campaign report for ${adAccount.client_name || adAccount.account_name} failed:`, errorMsg);
        throw new Error(`Campaign API Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Error fetching campaign report for ${adAccount.client_name || adAccount.account_name}:`, error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        throw new Error(`Campaign API Error: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error(`Campaign Network Error: No response from server`);
      } else {
        throw error;
      }
    }
  };

  // Define SAFE_MARGINS, COLORS, and drawSectionHeader as they are used by checkPageBreak
  // Assuming these are constants/helpers that should be defined globally or at this scope.


  // Helper to enforce strict page breaks (PDF-first layout engine)
  const checkPageBreak = (doc, yPos, heightNeeded, pageHeight, sectionTitle = '') => {
    const limit = pageHeight - SAFE_MARGINS.bottom;
    if (yPos + heightNeeded > limit) {
      doc.addPage();
      // Re-draw generic header or just reset Y
      if (sectionTitle) {
        drawSectionHeader(doc, sectionTitle + ' (continued)', COLORS.secondary);
        return SAFE_MARGINS.top + 30; // New Y start (SAFE_MARGINS.top + header height)
      }
      return SAFE_MARGINS.top;
    }
    return yPos;
  };

  // Start generation
  const generateCombinedPDF = async () => {
    // Check if we have accounts selected for organic/content performance
    const hasRegularAccounts = selectedAccounts.length > 0;
    // Check if we have ad accounts selected for campaigns
    const hasAdAccounts = selectedAdAccounts.length > 0;

    if (!hasRegularAccounts && !hasAdAccounts) {
      alert('Please select at least one account (regular or ad account)');
      return;
    }

    const selectedTypes = Object.entries(selectedReportTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      alert('Please select at least one report type');
      return;
    }

    // Validate campaign reports require ad accounts
    if (selectedReportTypes.campaigns && !hasAdAccounts) {
      alert('Campaign Analytics reports require ad accounts. Please select at least one ad account.');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: 0, message: 'Preparing reports...' });

    let allReports = []; // Declare outside try block for error handling

    try {
      const selectedAccountObjects = accounts.filter(acc => selectedAccounts.includes(acc.id));
      const selectedAdAccountObjects = adAccounts.filter(acc => selectedAdAccounts.includes(acc.id));
      allReports = [];

      // Calculate total steps correctly
      let totalSteps = 0;
      if (selectedReportTypes.organic && selectedAccountObjects.length > 0) {
        totalSteps += selectedAccountObjects.length;
      }
      if (selectedReportTypes.content_performance && selectedAccountObjects.length > 0) {
        totalSteps += selectedAccountObjects.length;
      }
      if (selectedReportTypes.campaigns && selectedAdAccountObjects.length > 0) {
        totalSteps += selectedAdAccountObjects.length;
      }

      if (totalSteps === 0) {
        throw new Error('No reports to fetch. Please select accounts and report types.');
      }

      setProgress({ current: 0, total: totalSteps, message: 'Fetching reports...' });
      let currentStep = 0;
      const fetchErrors = [];

      // Fetch organic and content performance reports for regular accounts
      for (let i = 0; i < selectedAccountObjects.length; i++) {
        const account = selectedAccountObjects[i];

        if (selectedReportTypes.organic) {
          currentStep++;
          setProgress({
            current: currentStep,
            total: totalSteps,
            message: `Fetching organic report for ${account.account_name}...`
          });
          try {
            const report = await fetchOrganicReport(account);
            if (report) {
              allReports.push(report);
              console.log(`✅ Organic report fetched successfully for ${account.account_name}`);
            } else {
              const errorMsg = `Failed to fetch organic report for ${account.account_name} - No data returned`;
              console.error(errorMsg);
              fetchErrors.push(errorMsg);
            }
          } catch (error) {
            const errorMsg = `Error fetching organic report for ${account.account_name}: ${error.message}`;
            console.error(errorMsg, error);
            fetchErrors.push(errorMsg);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (selectedReportTypes.content_performance) {
          currentStep++;
          setProgress({
            current: currentStep,
            total: totalSteps,
            message: `Fetching content performance report for ${account.account_name}...`
          });
          try {
            const report = await fetchContentPerformanceReport(account);
            if (report) {
              allReports.push(report);
              console.log(`✅ Content performance report fetched successfully for ${account.account_name}`);
            } else {
              const errorMsg = `Failed to fetch content performance report for ${account.account_name} - No data returned`;
              console.error(errorMsg);
              fetchErrors.push(errorMsg);
            }
          } catch (error) {
            const errorMsg = `Error fetching content performance report for ${account.account_name}: ${error.message}`;
            console.error(errorMsg, error);
            fetchErrors.push(errorMsg);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Fetch campaign reports for ad accounts
      if (selectedReportTypes.campaigns) {
        for (let i = 0; i < selectedAdAccountObjects.length; i++) {
          const adAccount = selectedAdAccountObjects[i];
          currentStep++;
          setProgress({
            current: currentStep,
            total: totalSteps,
            message: `Fetching campaign report for ${adAccount.client_name || adAccount.account_name}...`
          });
          try {
            const report = await fetchCampaignReportFromAdAccount(adAccount);
            if (report) {
              allReports.push(report);
              console.log(`✅ Campaign report fetched successfully for ${adAccount.client_name || adAccount.account_name}`);
            } else {
              const errorMsg = `Failed to fetch campaign report for ${adAccount.client_name || adAccount.account_name} - No data returned`;
              console.error(errorMsg);
              fetchErrors.push(errorMsg);
            }
          } catch (error) {
            const errorMsg = `Error fetching campaign report for ${adAccount.client_name || adAccount.account_name}: ${error.message}`;
            console.error(errorMsg, error);
            fetchErrors.push(errorMsg);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Log summary of fetched reports
      console.log(`📊 Report Fetch Summary: ${allReports.length} successful, ${fetchErrors.length} failed`);
      allReports.forEach((report, idx) => {
        console.log(`  ${idx + 1}. ${report.type} report for ${report.account?.account_name || 'Unknown'}`);
      });
      if (fetchErrors.length > 0) {
        console.error('❌ Failed Reports:');
        fetchErrors.forEach((error, idx) => {
          console.error(`  ${idx + 1}. ${error}`);
        });
      }

      // Log any fetch errors
      if (fetchErrors.length > 0) {
        console.warn('Some reports failed to fetch:', fetchErrors);
      }

      setProgress({ current: totalSteps, total: totalSteps, message: 'Generating PDF...' });

      // Generate combined PDF with presentation-style design
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 30;

      // Helper function to draw gradient background
      const drawGradientBackground = (y, height, color1, color2) => {
        const steps = 50;
        for (let i = 0; i < steps; i++) {
          const ratio = i / steps;
          const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
          const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
          const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(0, y + (height / steps) * i, pageWidth, height / steps, 'F');
        }
      };

      // Helper function to draw rounded rectangle (fallback for compatibility)
      const drawRoundedRect = (x, y, width, height, radius, mode) => {
        try {
          // Try roundedRect if available
          if (typeof doc.roundedRect === 'function') {
            doc.roundedRect(x, y, width, height, radius, radius, mode);
          } else {
            // Fallback to regular rectangle
            if (mode.includes('F')) {
              doc.rect(x, y, width, height, mode);
            } else {
              doc.rect(x, y, width, height, mode);
            }
          }
        } catch (e) {
          // Fallback to regular rectangle
          doc.rect(x, y, width, height, mode);
        }
      };

      // Helper function to draw metric card - Enhanced with better styling and trend indicators
      const drawMetricCard = (x, y, width, height, value, label, color, trend = null, icon = '') => {
        try {
          // Card shadow (subtle)
          doc.setFillColor(240, 240, 240);
          drawRoundedRect(x + 0.5, y + 0.5, width, height, 4, 'F');

          // Card background
          doc.setFillColor(...COLORS.primary);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          drawRoundedRect(x, y, width, height, 4, 'FD');

          // Color accent bar (thicker for better visibility)
          doc.setFillColor(...color);
          doc.rect(x, y, width, 6, 'F');

          // Value (larger, bolder) - H3 style (14pt) - SANITIZED
          doc.setFontSize(22);
          doc.setTextColor(...COLORS.text.primary);
          doc.setFont('helvetica', 'bold');
          const sanitizedValue = safeText(value, '0');
          const valueText = sanitizedValue.length > 15 ? sanitizedValue.substring(0, 12) + '...' : sanitizedValue;
          doc.text(valueText, x + width / 2, y + height / 2 - 2, { align: 'center', maxWidth: width - 12 });

          // Trend indicator if provided
          if (trend !== null && trend !== 0) {
            const trendX = x + width - 15;
            const trendY = y + height / 2 - 8;
            drawTrendArrow(trendX, trendY, trend, 5);
          }

          // Label (standardized body 10pt) - SANITIZED
          doc.setFontSize(10);
          doc.setTextColor(...COLORS.text.secondary);
          doc.setFont('helvetica', 'normal');
          const sanitizedLabel = safeText(label, 'Metric');
          const labelLines = doc.splitTextToSize(sanitizedLabel, width - 12);
          doc.text(labelLines, x + width / 2, y + height / 2 + 10, { align: 'center' });
        } catch (e) {
          console.error('Error drawing metric card:', e);
        }
      };

      // sanitizeText is now defined at module level, no need to redefine here

      // drawSectionHeader and drawImpactMetric are now defined at module level

      // drawSubsectionHeader and drawCardTitle are now defined at module level

      // Helper function to draw trend arrow
      const drawTrendArrow = (x, y, trend, size = 4) => {
        const isPositive = trend > 0;
        const color = isPositive ? COLORS.success : COLORS.error;
        doc.setFillColor(...color);
        doc.setTextColor(...color);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const arrow = isPositive ? '+' : '-';
        const text = `${arrow}${Math.abs(trend).toFixed(1)}%`;
        doc.text(safeText(text), x, y);
      };

      // Helper function to draw highlight box
      const drawHighlightBox = (x, y, width, height, title, content, color) => {
        try {
          // Box background with border
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(color[0], color[1], color[2]);
          doc.setLineWidth(0.5);
          drawRoundedRect(x, y, width, height, 3, 'FD');

          // Colored accent bar
          doc.setFillColor(...color);
          doc.rect(x, y, width, 4, 'F');

          // Title (standardized H3 equivalent for cards)
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...color);
          doc.text(safeText(title, 'Insight'), x + 5, y + 10);

          // Content (standardized body 10pt)
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.text.primary);
          const sanitizedContent = safeText(content, 'Information not available');
          const contentLines = doc.splitTextToSize(sanitizedContent, width - 10);
          doc.text(contentLines, x + 5, y + 18, { maxWidth: width - 10 });
        } catch (e) {
          console.error('Error drawing highlight box:', e);
        }
      };

      // drawProfessionalTable and drawSimpleBarChart are now defined at module level

      // Helper function to draw simple donut/pie chart (simplified visual representation)
      const drawSimpleDonutChart = (centerX, centerY, radius, data, options = {}) => {
        try {
          const { colors = [COLORS.secondary, COLORS.accent, COLORS.success, COLORS.warning] } = options;
          const total = data.reduce((sum, item) => sum + item.value, 0);

          if (total === 0) return centerY;

          // Draw legend with percentages (simplified - no actual pie drawing)
          let legendY = centerY;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.text.primary);
          doc.text('Distribution:', centerX - radius, legendY);
          legendY += 8;

          data.forEach((item, index) => {
            const percentage = (item.value / total) * 100;
            const color = colors[index % colors.length];

            // Color indicator
            doc.setFillColor(...color);
            doc.rect(centerX - radius, legendY - 3, 5, 5, 'F');

            // Label with percentage (Standardized 10pt)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.text.primary);
            const labelValue = `${safeText(item.label)}: ${formatNumber(item.value)} (${formatPercentage(percentage)})`;
            doc.text(labelValue, centerX - radius + 8, legendY);

            // Visual bar representation
            const barWidth = radius * 1.5;
            const barHeight = 4;
            const barValue = (item.value / total) * barWidth;
            doc.setFillColor(...color);
            doc.rect(centerX + radius, legendY - 3, barValue, barHeight, 'F');

            legendY += 10;
          });

          return legendY + 5;
        } catch (e) {
          console.error('Error drawing donut chart:', e);
          return centerY;
        }
      };

      // Map to aggregate metrics by unique account to avoid double counting across report types
      const accountMetricsMap = new Map();
      let totalContentPosts = 0;
      let totalContentER = 0;
      let totalAdSpend = 0;
      let totalAdReach = 0;
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalProfileViews = 0;
      let totalNewFollowers = 0;

      allReports.forEach(r => {
        const accId = r.account?.id || r.account?.account_name || 'unknown';
        if (!accountMetricsMap.has(accId)) {
          accountMetricsMap.set(accId, { followers: 0, posts: 0, reach: 0, engagement: 0, growth: false, primary: false });
        }
        const m = accountMetricsMap.get(accId);
        const data = r.data || {};

        if (r.type === 'organic') {
          const org = data.organic || data;
          m.followers = Math.max(m.followers, parseInt(org.followers || 0));
          m.posts = Math.max(m.posts, parseInt(org.posts || 0));
          m.reach = Math.max(m.reach, parseInt(org.reach || org.total_reach || 0));
          m.engagement = Math.max(m.engagement, parseInt(org.total_engagement || org.engagement || 0));
          totalImpressions += parseInt(org.impressions || 0);
          totalProfileViews += parseInt(org.profile_views || 0);
          totalNewFollowers += parseInt(org.new_followers || 0);
          if ((org.new_followers || 0) > 0) m.growth = true;
          m.primary = true;
        } else if (r.type === 'content_performance') {
          const posts = Array.isArray(data.posts) ? data.posts : [];
          totalContentPosts += posts.length;
          const sumEng = posts.reduce((sum, p) => sum + (p.engagement || 0), 0);
          const sumReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);

          m.engagement = Math.max(m.engagement, sumEng);
          m.reach = Math.max(m.reach, sumReach);
          posts.forEach(p => {
            totalContentER += parseFloat(p.engagement_rate || 0);
            totalImpressions += parseInt(p.impressions || p.views || 0);
          });
        } else if (r.type === 'campaigns') {
          totalAdSpend += parseFloat(data.total_spend || 0);
          totalAdReach += parseInt(data.total_reach || 0);
          totalClicks += parseInt(data.total_clicks || 0);

          const campaigns = data.campaigns || [];
          campaigns.forEach(c => {
            m.reach = Math.max(m.reach, parseInt(c.reach || 0));
          });
        }
      });

      let totalFollowers = 0;
      let totalPosts = 0;
      let totalReach = 0;
      let totalEngagement = 0;
      let accountsWithGrowth = 0;

      accountMetricsMap.forEach(m => {
        totalFollowers += m.followers;
        totalPosts += m.posts;
        totalReach += m.reach;
        totalEngagement += m.engagement;
        if (m.growth) accountsWithGrowth++;
      });

      const overallTotalReach = totalReach;
      const overallTotalEngagement = totalEngagement;
      const overallTotalFollowers = totalFollowers;
      const uniqueAccountsFound = accountMetricsMap.size;
      const totalAccounts = uniqueAccountsFound;
      const avgContentER = totalContentPosts > 0 ? (totalContentER / totalContentPosts) : 0;

      const growthHighlights = [];
      if (totalEngagement > 0) {
        growthHighlights.push(`Combined Engagement: ${formatNumber(totalEngagement)}`);
      }
      if (totalReach > 0) {
        growthHighlights.push(`Total Combined Reach: ${formatNumber(totalReach)}`);
      }
      if (totalFollowers > 0) {
        growthHighlights.push(`${formatNumber(totalFollowers)} Aggregate Followers`);
      }

      const reconciliationNote = `Note: Combined metrics aggregate data across ${uniqueAccountsFound} profiled account(s). (e.g., Combined Engagement: ${totalEngagement} | Primary Account: ${allReports[0]?.data?.organic?.total_engagement || allReports[0]?.data?.total_engagement || 0})`;


      // Cover Page - Minimal & Premium (Decision Artifact Style)
      doc.setFillColor(...COLORS.secondary);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      let coverYPos = pageHeight / 3;

      doc.setFontSize(48);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      // LOGO - Load actual logo image
      try {
        const logoImg = new Image();
        logoImg.src = '/logo/logo.png'; // Use user-provided logo path

        // Wait for logo to load
        await new Promise((resolve, reject) => {
          logoImg.onload = () => {
            try {
              // Create canvas to get image data
              const canvas = document.createElement('canvas');
              canvas.width = logoImg.width;
              canvas.height = logoImg.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(logoImg, 0, 0);

              // Get image data and add to PDF
              const imgData = canvas.toDataURL('image/png');

              // Calculate centered position and preserve aspect ratio (Issue 1)
              const maxLogoWidth = 60;
              const maxLogoHeight = 20;
              let finalLogoWidth = logoImg.width;
              let finalLogoHeight = logoImg.height;

              const widthRatio = maxLogoWidth / finalLogoWidth;
              const heightRatio = maxLogoHeight / finalLogoHeight;
              const bestRatio = Math.min(widthRatio, heightRatio);

              finalLogoWidth = finalLogoWidth * bestRatio;
              finalLogoHeight = finalLogoHeight * bestRatio;

              const logoX = (pageWidth - finalLogoWidth) / 2;
              doc.addImage(imgData, 'PNG', logoX, 20, finalLogoWidth, finalLogoHeight);
              resolve();
            } catch (e) {
              console.error('Error processing logo:', e);
              reject(e);
            }
          };
          logoImg.onerror = () => {
            console.warn('Logo image failed to load, using placeholder');
            reject(new Error('Logo load failed'));
          };

          // Timeout after 2 seconds
          setTimeout(() => reject(new Error('Logo load timeout')), 2000);
        });
      } catch (logoError) {
        console.warn('Could not load logo, using placeholder:', logoError);
        // Fallback to placeholder if logo fails to load (Centered)
        const placeholderWidth = 48;
        const logoX = (pageWidth - placeholderWidth) / 2;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoX, 20, placeholderWidth, 12, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.secondary);
        doc.setFont('helvetica', 'bold');
        doc.text('LOGO', logoX + (placeholderWidth / 2), 27, { align: 'center' });
      }

      // Reset text color for cover
      doc.setTextColor(255, 255, 255);

      const primaryAccount = allReports.length > 0
        ? (allReports[0].account?.account_name || 'Project Name')
        : 'Performance Report';
      doc.text(safeText(primaryAccount), pageWidth / 2, coverYPos, { align: 'center' });

      coverYPos += 16;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Organic & Paid Performance Report', pageWidth / 2, coverYPos, { align: 'center' });

      coverYPos += 40;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2 - 40, coverYPos, pageWidth / 2 + 40, coverYPos);

      coverYPos += 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      const intentText = 'A performance review of organic content and paid campaigns with clear next-step recommendations.';
      const intentLines = doc.splitTextToSize(intentText, pageWidth - 100);
      doc.text(intentLines, pageWidth / 2, coverYPos, { align: 'center' });

      // Bottom Meta - Discreet
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`REPORTING PERIOD: ${startDate} — ${endDate}`, pageWidth / 2, pageHeight - 55, { align: 'center' });


      // Generate each report section - Slide-style pages
      // Use for...of loop instead of forEach to support async/await
      yPos = 30; // Initialize yPos outside loop so it's accessible after
      for (let index = 0; index < allReports.length; index++) {
        const report = allReports[index];
        doc.addPage();

        const headerColor = report.type === 'organic' ? COLORS.secondary :
          report.type === 'content_performance' ? COLORS.accent :
            COLORS.accent;
        const accountName = report.account?.account_name || report.account?.client_name || 'Unknown Account';
        drawSectionHeader(doc, accountName, headerColor);

        yPos = 30; // Reset yPos for each new report section

        // Report type badge - CENTERED (User Feedback)
        const reportTypeLabel = report.type === 'organic' ? 'Organic Report' :
          report.type === 'content_performance' ? 'Content Performance Report' :
            'Campaign Report';

        const badgeWidth = 80;
        const badgeX = (pageWidth - badgeWidth) / 2;

        doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
        try {
          if (typeof doc.roundedRect === 'function') {
            doc.roundedRect(badgeX, yPos, badgeWidth, 8, 2, 2, 'F');
          } else {
            doc.rect(badgeX, yPos, badgeWidth, 8, 'F');
          }
        } catch (e) {
          doc.rect(badgeX, yPos, badgeWidth, 8, 'F');
        }
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTypeLabel, pageWidth / 2, yPos + 5.5, { align: 'center' });

        yPos += 15;

        // Period info
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${startDate} to ${endDate}`, 20, yPos);
        yPos += 10;

        // Helper function to draw section header (needed in report sections)
        const drawSectionHeaderLocal = (text, y, color) => {
          try {
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(0, y, pageWidth, 20, 'F');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(safeText(text), 20, y + 13);
          } catch (e) {
            console.error('Error in drawSectionHeaderLocal:', e);
          }
        };

        // Generate report content based on type
        try {
          // Validate report structure
          if (!report || !report.type) {
            console.error('Invalid report structure:', report);
            throw new Error('Invalid report structure');
          }

          if (report.type === 'organic') {
            yPos = await generateOrganicReportSection(doc, report, yPos, drawSectionHeaderLocal, pageHeight);
          } else if (report.type === 'content_performance') {
            yPos = await generateContentPerformanceSection(doc, report, yPos, drawSectionHeaderLocal, pageHeight);
          } else if (report.type === 'campaigns') {
            yPos = generateCampaignReportSection(doc, report, yPos, drawSectionHeaderLocal, pageHeight);
          } else {
            console.warn(`Unknown report type: ${report.type}`);
          }
        } catch (sectionError) {
          console.error(`Error generating section for ${report?.account?.account_name || 'Unknown'} (${report?.type || 'Unknown'}):`, sectionError);
          // Continue with next report instead of failing completely
          doc.addPage();
          doc.setFontSize(14);
          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
          const accountName = report?.account?.account_name || report?.account?.client_name || 'Unknown Account';
          doc.text(`Error generating ${report?.type || 'unknown'} report for ${accountName}`, 20, 30);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`Error: ${sectionError?.message || 'Unknown error'}`, 20, 40);
          yPos = 60; // Set yPos after error message
        }
      }

      // Validate we have reports before generating
      if (!allReports || allReports.length === 0) {
        throw new Error('No reports were successfully fetched. Please check your account connections and try again.');
      }

      // Add Cross-Section Summary before conclusion
      doc.addPage();

      // Cross-Section Summary - Enhanced Professional Format
      drawSectionHeader(doc, 'Strategic Analysis & Connections', COLORS.secondary);
      yPos = 35;

      // Subsection header (H2)
      yPos = drawSubsectionHeader(doc, 'Connecting the Dots', yPos, COLORS.text.primary);
      yPos += 5;

      // Analyze all reports
      const organicReports = allReports.filter(r => r.type === 'organic');
      const contentReports = allReports.filter(r => r.type === 'content_performance');
      const campaignReports = allReports.filter(r => r.type === 'campaigns');

      // Organic → Content connection
      if (organicReports.length > 0 && contentReports.length > 0) {
        yPos = ensureSpace(doc, yPos, 50, pageHeight, 'Strategic Connections', COLORS.secondary);

        const connectionBoxWidth = pageWidth - 40;
        const connectionBoxHeight = 25;
        drawHighlightBox(20, yPos, connectionBoxWidth, connectionBoxHeight,
          'Organic Performance → Content Strategy',
          'Analyzing how account-level metrics relate to individual post performance',
          COLORS.secondary);
        yPos += connectionBoxHeight + 8;

        // Calculate metrics
        let totalOrganicEngagement = 0;
        let totalOrganicFollowers = 0;
        organicReports.forEach(r => {
          const data = r.data?.organic || {};
          totalOrganicEngagement += (data.total_engagement || 0);
          totalOrganicFollowers += (data.followers || 0);
        });

        let totalContentPosts = 0;
        let totalContentEngagement = 0;
        let avgContentER = 0;
        contentReports.forEach(r => {
          const posts = r.data?.posts || [];
          totalContentPosts += posts.length;
          posts.forEach(p => {
            totalContentEngagement += (p.engagement || 0);
            avgContentER += parseFloat(p.engagement_rate || 0);
          });
        });
        if (totalContentPosts > 0) avgContentER = avgContentER / totalContentPosts;
        const avgOrganicER = totalOrganicFollowers > 0 ? (totalOrganicEngagement / totalOrganicFollowers * 100) : 0;

        let organicContentInsight = '';
        let organicContentAction = '';

        if (avgOrganicER > 3 && avgContentER > 3) {
          organicContentInsight = `Strong alignment: Organic engagement (${avgOrganicER.toFixed(1)}%) matches content performance (${avgContentER.toFixed(1)}% avg ER).`;
          organicContentAction = 'Maintain current content mix while testing variations to reach new growth plateaus.';
        } else if (avgOrganicER > avgContentER * 1.2) {
          organicContentInsight = `Organic reach (${avgOrganicER.toFixed(1)}%) is strong, but individual posts (${avgContentER.toFixed(1)}% avg ER) need optimization.`;
          organicContentAction = 'Increase post-level engagement by using stronger hooks and call-to-actions.';
        } else {
          organicContentInsight = `Organic engagement (${avgOrganicER.toFixed(1)}%) and content performance (${avgContentER.toFixed(1)}% avg ER) show room for improvement.`;
          organicContentAction = 'Identify top 3 performing posts and replicate their visual style.';
        }

        // Bold Opportunity/Action labels for scannability
        doc.setFont('helvetica', 'bold');
        doc.text('Opportunity:', 25, yPos);
        doc.setFont('helvetica', 'normal');
        yPos = drawWrappedText(doc, ` ${organicContentInsight}`, 25 + 25, yPos, pageWidth - 75, { fontSize: 10, color: COLORS.text.primary });
        yPos += 3;
        doc.setFont('helvetica', 'bold');
        doc.text('Action:', 25, yPos);
        doc.setFont('helvetica', 'normal');
        yPos = drawWrappedText(doc, ` ${organicContentAction}`, 25 + 18, yPos, pageWidth - 68, { fontSize: 10, color: COLORS.text.secondary });
        yPos += 8;
      }

      // Content → Ads connection
      if (contentReports.length > 0) {
        yPos = ensureSpace(doc, yPos, 60, pageHeight, 'Strategic Connections', COLORS.secondary);

        let bestDay = 'N/A';
        let bestType = 'N/A';
        const dayCounts = {};
        const typeStats = {};

        allReports.forEach(r => {
          if (r.data?.posts) {
            r.data.posts.forEach(p => {
              const er = parseFloat(p.engagement_rate || 0);
              if (p.timestamp) {
                const day = new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
                dayCounts[day] = (dayCounts[day] || 0) + er;
              }
              const type = (p.media_type || 'IMAGE').toUpperCase();
              typeStats[type] = (typeStats[type] || { sum: 0, count: 0 });
              typeStats[type].sum += er;
              typeStats[type].count += 1;
            });
          }
        });

        const sortedDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
        if (sortedDays.length > 0) bestDay = sortedDays[0][0];

        const sortedTypes = Object.entries(typeStats).sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count));
        if (sortedTypes.length > 0) bestType = sortedTypes[0][0];

        drawHighlightBox(20, yPos, pageWidth - 40, 25,
          'Content Intelligence & Scheduling',
          `Top Type: ${bestType} | Best Day: ${bestDay}s`,
          COLORS.accent);
        yPos += 33;

        doc.setFont('helvetica', 'bold');
        doc.text('Insight:', 25, yPos);
        doc.setFont('helvetica', 'normal');
        yPos = drawWrappedText(doc, ` ${bestType} content and ${bestDay} postings show higher engagement.`, 25 + 18, yPos, pageWidth - 68, { fontSize: 10 });
        yPos += 3;
        doc.setFont('helvetica', 'bold');
        doc.text('Action:', 25, yPos);
        doc.setFont('helvetica', 'normal');
        yPos = drawWrappedText(doc, ` Prioritize ${bestType} formats in paid campaigns.`, 25 + 18, yPos, pageWidth - 68, { fontSize: 10, color: COLORS.text.secondary });
        yPos += 10;
      }


      // Paid Performance & Impact (merged into Strategic Analysis)
      yPos = ensureSpace(doc, yPos, 60, pageHeight, 'Strategic Connections', COLORS.secondary);

      yPos = drawSubsectionHeader(doc, 'Paid Performance & Impact', yPos, COLORS.text.primary);
      yPos += 5;

      // Ads → Organic connection
      if (campaignReports.length > 0 && organicReports.length > 0) {
        yPos = ensureSpace(doc, yPos, 50, pageHeight, 'Strategic Connections', COLORS.secondary);

        drawHighlightBox(20, yPos, pageWidth - 40, 25,
          'Ad Performance → Organic Growth',
          'Measuring how paid campaigns contribute to organic audience growth',
          COLORS.warning);
        yPos += 33;

        let totalAdSpend = 0;
        let totalAdReach = 0;
        campaignReports.forEach(r => {
          const campaigns = r.data?.campaigns || [];
          campaigns.forEach(c => {
            totalAdSpend += (c.amount_spent || 0);
            totalAdReach += (c.reach || 0);
          });
        });

        if (totalAdSpend > 0) {
          doc.setFont('helvetica', 'normal');
          yPos = drawWrappedText(doc, `Ad investment: ${formatCurrency(totalAdSpend)} reached ${formatNumber(totalAdReach)} customers.`, 25, yPos, pageWidth - 50, { fontSize: 10 });
          yPos += 3;
          doc.setFont('helvetica', 'bold');
          doc.text('Strategy:', 25, yPos);
          doc.setFont('helvetica', 'normal');
          yPos = drawWrappedText(doc, ` Align ad messaging with top organic content for consistent brand voice.`, 25 + 22, yPos, pageWidth - 72, { fontSize: 10, color: COLORS.text.secondary });
        } else {
          doc.setFont('helvetica', 'bold');
          doc.text('Recommendation:', 25, yPos);
          doc.setFont('helvetica', 'normal');
          yPos = drawWrappedText(doc, ` Use focused ad spend to amplify top organic content.`, 25 + 38, yPos, pageWidth - 88, { fontSize: 10 });
        }
        yPos += 8;
      }




      // Overall business outcome - Enhanced
      yPos += 5;
      const impactLabel = uniqueAccountsFound === 1 ? 'Organic engagement (primary account)' : 'Combined engagement';
      drawHighlightBox(20, yPos, pageWidth - 40, 25,
        'Overall Business Impact',
        safeText(`Combined reach: ${formatNumber(overallTotalReach)} | ${impactLabel}: ${formatNumber(overallTotalEngagement)} | Multi-channel approach active.`),
        COLORS.success);
      yPos += 30;

      // Final Conclusion Page
      doc.addPage();
      drawSectionHeader(doc, 'Strategic Conclusion', COLORS.secondary);
      yPos = SAFE_MARGINS.top;

      // Calculate performance metrics for conclusion
      const overallResonanceResult = overallTotalFollowers > 0 ? (overallTotalEngagement / overallTotalFollowers) * 100 : 0;
      const growthRate = totalAccounts > 0 ? (accountsWithGrowth / totalAccounts * 100) : 0;

      // Find biggest win and biggest gap
      let biggestWinText = 'Consistent engagement across content.';
      let maxERValue = 0;
      let lowestERValue = 100;
      let biggestGapText = 'Some content underperformed relative to top posts.';

      allReports.forEach(r => {
        const postsContent = (r.data?.organic?.top_posts || r.data?.posts || []);
        postsContent.forEach(p => {
          const er = parseFloat(p.engagement_rate || 0);
          if (er > maxERValue && er > 0) {
            maxERValue = er;
            biggestWinText = `Post by ${r.account?.account_name || 'Primary Account'} achieved ${er.toFixed(1)}% engagement rate.`;
          }
          if (er < lowestERValue && er > 0) {
            lowestERValue = er;
          }
        });
      });

      if (lowestERValue < maxERValue * 0.3 && lowestERValue < 100) {
        biggestGapText = `Some posts achieved only ${lowestERValue.toFixed(1)}% ER compared to top performers at ${maxERValue.toFixed(1)}%, indicating inconsistent content quality.`;
      } else if (totalNewFollowers === 0) {
        biggestGapText = 'Audience growth is stagnant — no new followers acquired during this period.';
      } else if (overallResonanceResult < 2) {
        biggestGapText = `Overall engagement rate (${overallResonanceResult.toFixed(1)}%) is below industry benchmarks, suggesting content needs stronger hooks.`;
      }

      // === BLOCK 1: WHAT WORKED ===
      doc.setFontSize(TYPOGRAPHY.h3.size);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.success);
      doc.text('WHAT WORKED', 20, yPos);
      yPos += 8;

      const workedItems = [];

      if (maxERValue > 3) {
        workedItems.push(biggestWinText);
      }
      if (totalEngagement > 0) {
        workedItems.push(`Generated ${formatNumber(totalEngagement)} total engagements across ${formatNumber(totalPosts)} posts.`);
      }
      if (totalReach > 0) {
        workedItems.push(`Achieved ${formatNumber(totalReach)} combined reach, expanding brand visibility.`);
      }
      if (totalNewFollowers > 0) {
        workedItems.push(`Acquired ${formatNumber(totalNewFollowers)} new followers, indicating positive growth momentum.`);
      }

      if (workedItems.length === 0) {
        workedItems.push('Content maintained baseline engagement levels.');
      }

      workedItems.forEach(item => {
        doc.setFontSize(TYPOGRAPHY.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.primary);
        yPos = drawWrappedText(doc, `• ${item}`, 25, yPos, pageWidth - 50, {
          fontSize: TYPOGRAPHY.body.size,
          color: COLORS.text.primary
        });
        yPos += 2;
      });

      yPos += 12;

      // === BLOCK 2: WHAT DIDN'T WORK ===
      yPos = ensureSpace(doc, yPos, 40, pageHeight, 'Conclusion', COLORS.secondary);

      doc.setFontSize(TYPOGRAPHY.h3.size);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.warning);
      doc.text('WHAT DIDN\'T WORK', 20, yPos);
      yPos += 8;

      const gapItems = [];

      if (totalNewFollowers === 0) {
        gapItems.push('Zero new follower growth - audience acquisition strategies need attention.');
      }
      if (overallResonanceResult < 2) {
        gapItems.push(`Low engagement rate (${overallResonanceResult.toFixed(1)}%) suggests content isn't resonating with audience.`);
      }
      if (lowestERValue < maxERValue * 0.3 && lowestERValue < 100) {
        gapItems.push('Significant performance gap between top and bottom posts indicates inconsistent content quality.');
      }
      if (totalAdSpend > 0 && totalAdReach === 0) {
        gapItems.push('Paid campaigns generated spend but minimal measurable reach.');
      }

      if (gapItems.length === 0) {
        gapItems.push('No major performance gaps identified - focus on optimization and scaling.');
      }

      gapItems.forEach(item => {
        doc.setFontSize(TYPOGRAPHY.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.primary);
        yPos = drawWrappedText(doc, `• ${item}`, 25, yPos, pageWidth - 50, {
          fontSize: TYPOGRAPHY.body.size,
          color: COLORS.text.primary
        });
        yPos += 2;
      });

      yPos += 12;

      // === BLOCK 3: WHAT TO DO NEXT (30 DAYS) ===
      yPos = ensureSpace(doc, yPos, 40, pageHeight, 'Conclusion', COLORS.secondary);

      doc.setFontSize(TYPOGRAPHY.h3.size);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.accent);
      doc.text('NEXT 30 DAYS: ACTION PLAN', 20, yPos);
      yPos += 8;

      const actionItems = [];

      if (totalNewFollowers === 0) {
        actionItems.push('Launch targeted follower acquisition campaign using top-performing content as creative.');
      } else if (overallResonanceResult > 3) {
        actionItems.push('Scale current content strategy - increase posting frequency by 30% in high-performing formats.');
      } else {
        actionItems.push('Test 3 new content formats to identify stronger engagement patterns.');
      }

      if (maxERValue > 0) {
        actionItems.push('Replicate the style, timing, and format of top-performing posts identified in this report.');
      }

      if (totalAdSpend === 0 && totalReach > 0) {
        actionItems.push('Allocate small test budget ($100-200) to amplify top organic posts and measure paid reach efficiency.');
      }

      actionItems.push('Review this report monthly and track progress against these specific action items.');

      actionItems.forEach((item, index) => {
        doc.setFontSize(TYPOGRAPHY.body.size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        yPos = drawWrappedText(doc, `${index + 1}. ${item}`, 25, yPos, pageWidth - 50, {
          fontSize: TYPOGRAPHY.body.size,
          color: COLORS.accent,
          style: 'bold'
        });
        yPos += 4;
      });

      // Post-Conclusion Strategic Note
      yPos = ensureSpace(doc, yPos, 25, pageHeight, 'Conclusion', COLORS.secondary);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(160, 160, 160);
      const disclaimer = 'Note: Action items are prioritized based on current performance data. Consistent execution over 30 days is critical for measurable improvement.';
      drawWrappedText(doc, disclaimer, 20, yPos, pageWidth - 40, {
        fontSize: 8,
        color: [160, 160, 160]
      });

      // GLOBAL FOOTER INJECTION
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Branding Line
        doc.setDrawColor(...COLORS.accent);
        doc.setLineWidth(0.1);
        doc.line(SAFE_MARGINS.left, pageHeight - 15, pageWidth - SAFE_MARGINS.right, pageHeight - 15);

        // Metadata Text
        doc.setFontSize(TYPOGRAPHY.caption.size);
        doc.setTextColor(...COLORS.text.light);
        doc.setFont('helvetica', 'normal');

        doc.text('DIGI CAROTENE - STRATEGIC ARTIFACT', SAFE_MARGINS.left, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - SAFE_MARGINS.right, pageHeight - 10, { align: 'right' });
      }

      // Save PDF
      const filename = `Combined_Report_${startDate}_to_${endDate}_${new Date().getTime()}.pdf`;

      try {
        doc.save(filename);
        let successMessage = `Combined report generated successfully! ${allReports.length} report(s) included.`;

        if (fetchErrors.length > 0) {
          successMessage += `\n\nNote: ${fetchErrors.length} report(s) failed to fetch:\n`;
          fetchErrors.forEach((error, idx) => {
            successMessage += `\n${idx + 1}. ${error}`;
          });
          successMessage += `\n\nCheck browser console (F12) for detailed error messages.`;
        }

        alert(successMessage);

        // Log detailed summary
        console.log('📄 PDF Generated Successfully!');
        console.log(`   File: ${filename}`);
        console.log(`   Reports included: ${allReports.length}`);
        allReports.forEach((report, idx) => {
          console.log(`   ${idx + 1}. ${report.type} - ${report.account?.account_name || 'Unknown'}`);
        });
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        throw new Error(`Failed to save PDF: ${saveError.message}`);
      }
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        allReports: allReports?.length
      });
      alert(`Failed to generate combined report: ${error.message}\n\nPlease check the browser console for more details.`);
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  const generateOrganicReportSection = async (doc, report, startY, drawSectionHeader, pageHeight) => {
    let yPos = startY;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Validate report structure
    if (!report) {
      throw new Error('Report is null or undefined');
    }

    const data = report.data || {};
    const accountName = report.account?.account_name || 'Unknown Account';

    if (!data || typeof data !== 'object') {
      console.warn('Invalid report data structure, using empty object');
      // Don't throw - continue with empty data
    }

    // Helper function to draw rounded rectangle (fallback for compatibility)
    const drawRoundedRect = (x, y, width, height, radius, mode) => {
      try {
        // Try roundedRect if available
        if (typeof doc.roundedRect === 'function') {
          doc.roundedRect(x, y, width, height, radius, radius, mode);
        } else {
          // Fallback to regular rectangle
          if (mode.includes('F')) {
            doc.rect(x, y, width, height, mode);
          } else {
            doc.rect(x, y, width, height, mode);
          }
        }
      } catch (e) {
        // Fallback to regular rectangle
        doc.rect(x, y, width, height, mode);
      }
    };

    // Helper function to draw metric card - Enhanced with better styling - SANITIZED
    const drawMetricCardLocal = (x, y, width, height, value, label, color, icon = '') => {
      try {
        // Card shadow (subtle)
        doc.setFillColor(240, 240, 240);
        drawRoundedRect(x + 0.5, y + 0.5, width, height, 4, 'F');

        // Card background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        drawRoundedRect(x, y, width, height, 4, 'FD');

        // Color accent bar (thicker for better visibility)
        doc.setFillColor(...color);
        doc.rect(x, y, width, 5, 'F');

        // Value (larger, bolder) - SANITIZED
        doc.setFontSize(22);
        doc.setTextColor(...COLORS.text.primary);
        doc.setFont('helvetica', 'bold');
        const sanitizedValue = safeText(value, '0');
        const valueText = sanitizedValue.length > 18 ? sanitizedValue.substring(0, 15) + '...' : sanitizedValue;
        doc.text(valueText, x + width / 2, y + height / 2 - 1, { align: 'center', maxWidth: width - 8 });

        // Label (standardized body 10pt) - SANITIZED
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.text.secondary);
        doc.setFont('helvetica', 'normal');
        const labelLines = doc.splitTextToSize(safeText(label, 'Metric'), width - 12);
        doc.text(labelLines, x + width / 2, y + height / 2 + 7, { align: 'center' });
      } catch (e) {
        console.error('Error drawing metric card:', e);
      }
    };

    // Handle different data structures - check if data is directly organic or nested
    let organic = data.organic || {};

    // If data structure is flat (no 'organic' key), use data directly
    if (!data.organic && (data.followers !== undefined || data.total_engagement !== undefined)) {
      organic = data;
    }

    // Debug log to see what we're getting
    console.log('Organic report data structure:', {
      hasOrganic: !!data.organic,
      hasDirectData: !!(data.followers || data.total_engagement),
      organicKeys: Object.keys(organic),
      sampleValues: {
        followers: organic.followers,
        total_engagement: organic.total_engagement,
        posts: organic.posts || organic.posts_count
      }
    });

    // Calculate engagement rate
    const engagementRate = organic.followers && organic.followers > 0
      ? ((organic.total_engagement || 0) / organic.followers * 100).toFixed(2)
      : '0.00';

    const avgEngagementPerPost = organic.posts && organic.posts > 0
      ? Math.round((organic.total_engagement || 0) / organic.posts)
      : 0;

    // 1. Contextual Performance Signal
    yPos = drawSubsectionHeader(doc, 'Organic Growth Context', yPos, COLORS.secondary);

    const isGrowing = (organic.new_followers || 0) > 0;

    // Fix Repetition: Focus on WHY (Analysis) rather than WHAT (Status)
    const summaryNarrative = `Analysis of community depth indicates ${parseFloat(engagementRate) > 3 ? 'strong interaction density' : 'passive consumption patterns'}. The ${isGrowing ? 'acquisition' : 'retention'} dynamic suggests current content is primarily ${isGrowing ? 'reaching new audiences' : 'serving existing followers'}.`;

    yPos = drawWrappedText(doc, summaryNarrative, SAFE_MARGINS.left, yPos, pageWidth - SAFE_MARGINS.left - SAFE_MARGINS.right, {
      fontSize: TYPOGRAPHY.body.size,
      color: COLORS.text.secondary
    });

    yPos += 5;

    yPos += 10;

    // Top 5 Posts Section - Video posts only (image views unavailable)

    // Top 5 Posts Section
    const topStoriesCheck = Array.isArray(organic.top_posts) ? organic.top_posts : [];
    if (topStoriesCheck.length > 0) {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        const accountName = report.account?.account_name || 'Unknown Account';
        drawSectionHeader(doc, accountName + ' - Organic Report (continued)', COLORS.secondary);
        yPos = 30;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Performing Posts', 20, yPos);
      yPos += 6;

      // Add context subtitle
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Ranked by engagement rate. Posts sorted by highest engagement rate first.', 20, yPos);
      yPos += 8;

      // Sort posts by engagement rate descending, then take top 5
      const sortedTopPosts = [...(organic.top_posts || [])].sort((a, b) => {
        const erA = parseFloat(a.engagement_rate || 0);
        const erB = parseFloat(b.engagement_rate || 0);
        return erB - erA; // Descending order
      }).slice(0, 5);

      // Prepare posts data with thumbnails - Enhanced with Views and context
      const topPostsData = sortedTopPosts.map((post, index) => {
        const mediaType = (post.media_type || 'IMAGE').toUpperCase();
        const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
        let date = 'N/A';
        if (post.timestamp) {
          try {
            const postDate = new Date(post.timestamp);
            date = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } catch (e) {
            date = 'N/A';
          }
        }

        // Calculate why this post performed well
        const engagementRate = parseFloat(post.engagement_rate || 0);
        const views = post.views || 0;
        const likes = post.likes || 0;
        const comments = post.comments || 0;
        const engagement = post.engagement || 0;

        // Determine performance reason
        let performanceReason = '';
        if (engagementRate > 5) {
          performanceReason = 'Excellent engagement rate';
        } else if (engagementRate > 3) {
          performanceReason = 'Strong engagement';
        } else if (views > 0 && (views / (likes || 1)) < 10) {
          performanceReason = 'High view-to-like ratio';
        } else if (comments > likes * 0.1) {
          performanceReason = 'High comment engagement';
        } else if (isVideo && views > 1000) {
          performanceReason = 'Strong video performance';
        } else {
          performanceReason = 'Good overall metrics';
        }

        // Format views - clarify if unavailable (Issue: Post Views)
        let viewsDisplay = 'N/A*';
        if (views > 0) {
          viewsDisplay = views.toLocaleString();
        } else if (isVideo) {
          viewsDisplay = '0'; // Video with actual 0 views
        } else {
          viewsDisplay = 'N/A*'; // Image (Platform limitation)
        }

        // Get caption/creative text
        let creativeText = post.caption || post.description || 'Post #' + (index + 1);
        if (creativeText.length > 30) creativeText = creativeText.substring(0, 27) + '...';
        creativeText = creativeText.replace(/[\n\r]/g, ' ');

        return {
          rowData: [
            creativeText, // Creative (Text Description) - Replaces thumbnail
            date, // Date
            mediaType.charAt(0) + mediaType.slice(1).toLowerCase(), // Type (e.g., Image/Video)
            (post.likes || 0).toLocaleString(),
            (post.comments || 0).toLocaleString(),
            (post.engagement || 0).toLocaleString(),
            (post.engagement_rate || 0).toFixed(1) + '%',
            (post.engagement_rate || 0).toFixed(1) + '%'
          ],
          thumbnailUrl: post.thumbnail_url || post.media_url || '',
          mediaType: mediaType,
          date: date,
          index: index + 1,
          isVideo: isVideo,
          performanceReason: performanceReason,
          engagementRate: engagementRate,
          views: views
        };
      });

      // Pre-load images for top posts
      let topPostsImageCache = new Map();
      try {
        console.log('🖼️ Pre-loading images for top posts...');
        topPostsImageCache = await preloadImages(topPostsData);
        console.log('✅ Loaded', topPostsImageCache.size, 'top post images successfully');
      } catch (imageError) {
        console.warn('⚠️ Top posts image pre-loading failed, continuing without images:', imageError);
      }

      // STRICT Thumbnail Drawer (User Feedback: Fix Thumbnails)
      const drawThumbnailCell = (cellData) => {
        if (cellData.section !== 'body') return;
        if (cellData.column.index !== 0) return;

        const rowIndex = cellData.row.index;
        const post = topPostsData[rowIndex];
        if (!post) return;

        const thumbSize = 12; // 12mm fixed size
        const cell = cellData.cell;
        const x = cell.x + 2; // Left padding
        const y = cell.y + (cell.height - thumbSize) / 2; // Center vertically

        // Clear text
        cell.text = '';

        // Draw Image
        const cachedImage = topPostsImageCache.get(post.index);
        const isVideo = post.isVideo;

        if (cachedImage) {
          try {
            doc.addImage(cachedImage, 'JPEG', x, y, thumbSize, thumbSize, undefined, 'FAST');
            // Border
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.rect(x, y, thumbSize, thumbSize, 'D');
          } catch (e) {
            // Fallback
            doc.setFillColor(245, 245, 245);
            doc.rect(x, y, thumbSize, thumbSize, 'F');
          }
        } else {
          // Placeholder
          doc.setFillColor(245, 245, 245);
          doc.rect(x, y, thumbSize, thumbSize, 'F');
        }

        // Video Badge
        if (isVideo) {
          doc.setFillColor(236, 72, 153); // Pink
          doc.circle(x + thumbSize - 2, y + 2, 1.5, 'F');
        }
      };

      autoTable(doc, {
        startY: yPos,
        head: [['Creative', 'Date', 'Type', 'Likes', 'Comments', 'Eng', 'ER%']], // Short Headers (Issue 2 - Removed Views)
        body: topPostsData.map(p => p.rowData),
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: COLORS.text.primary,
          lineWidth: 0.1,
          lineColor: [230, 235, 240],
          minCellHeight: 16, // Enough for thumbnail
          valign: 'middle'
        },
        headStyles: {
          fillColor: COLORS.secondary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left', cellPadding: { left: 16 } }, // Padding for thumbnail
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: COLORS.accent }
        },
        margin: { left: 20, right: 20 },
        didDrawCell: drawThumbnailCell, // Hook up strict drawer
        didParseCell: (hookData) => {
          // Text truncation for Creative column
          if (hookData.column.index === 0 && hookData.cell.section === 'body') {
            const text = hookData.cell.text[0] || '';
            if (text.length > 32) {
              hookData.cell.text = [text.substring(0, 30) + '...'];
            }
          }
        }
      });

      yPos = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.text.light);
      doc.setFont('helvetica', 'italic');
      doc.text('* Note: N/A indicates value unavailable from platform API (common for image posts).', 20, yPos);
      yPos += 10;

      // Add insights section for Top 5 Posts
      if (yPos > pageHeight - 80) {
        doc.addPage();
        const accountName = report.account?.account_name || 'Unknown Account';
        drawSectionHeader(doc, accountName + ' - Organic Report (continued)', COLORS.secondary);
        yPos = 30;
      }

      // Performance Insights with Visual Charts
      yPos = drawSubsectionHeader(doc, 'Performance Insights', yPos, COLORS.text.primary);
      yPos += 5;

      // Analyze top posts - Data-validated insights
      const videoPosts = topPostsData.filter(p => p.isVideo);
      const imagePosts = topPostsData.filter(p => !p.isVideo);
      const videoCount = videoPosts.length;
      const imageCount = imagePosts.length;

      // Calculate average ER by type (data-validated)
      const videoAvgER = videoPosts.length > 0
        ? videoPosts.reduce((sum, p) => sum + p.engagementRate, 0) / videoPosts.length
        : 0;
      const imageAvgER = imagePosts.length > 0
        ? imagePosts.reduce((sum, p) => sum + p.engagementRate, 0) / imagePosts.length
        : 0;

      const avgEngagementRate = topPostsData.reduce((sum, p) => sum + p.engagementRate, 0) / topPostsData.length;
      const topPost = topPostsData[0];

      // Content Type Performance Bar Chart REMOVED (Issue 4) - Replaced with text insight
      // ...chart code removed...

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      // What worked - Data-validated insights (FIXED: sanitize text to prevent double-encoding)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('What Worked:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const insights = [];
      if (topPost.engagementRate > 5) {
        insights.push(`Top post (#${topPost.index}) achieved ${topPost.engagementRate.toFixed(1)}% engagement rate - excellent performance`);
      } else if (topPost.engagementRate > 3) {
        insights.push(`Top post (#${topPost.index}) achieved ${topPost.engagementRate.toFixed(1)}% engagement rate - strong performance`);
      }

      // Data-validated comparison: compare actual ER averages, not just counts
      if (videoCount > 0 && imageCount > 0) {
        if (videoAvgER > imageAvgER * 1.1) { // Videos significantly outperform
          insights.push(`Videos outperformed images: ${videoAvgER.toFixed(1)}% avg ER vs ${imageAvgER.toFixed(1)}% avg ER`);
        } else if (imageAvgER > videoAvgER * 1.1) { // Images significantly outperform
          insights.push(`Images outperformed videos: ${imageAvgER.toFixed(1)}% avg ER vs ${videoAvgER.toFixed(1)}% avg ER`);
        } else {
          insights.push(`Both content types performed similarly: Videos ${videoAvgER.toFixed(1)}% vs Images ${imageAvgER.toFixed(1)}% avg ER`);
        }
      } else if (videoCount > 0) {
        insights.push(`All top 5 posts are videos with ${videoAvgER.toFixed(1)}% average engagement rate`);
      } else if (imageCount > 0) {
        insights.push(`All top 5 posts are images with ${imageAvgER.toFixed(1)}% average engagement rate`);
      }

      if (avgEngagementRate > 3) {
        insights.push(`Strong average engagement rate of ${avgEngagementRate.toFixed(1)}% across top 5 posts`);
      } else if (avgEngagementRate > 1) {
        insights.push(`Average engagement rate of ${avgEngagementRate.toFixed(1)}% across top 5 posts`);
      }

      if (topPost.views > 0 && topPost.views > 1000) {
        insights.push(`Top post generated ${topPost.views.toLocaleString()} views`);
      }

      if (insights.length === 0) {
        insights.push('Posts show consistent engagement patterns');
      }

      insights.forEach((insight, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          const accountName = report.account?.account_name || 'Unknown Account';
          drawSectionHeader(doc, accountName + ' - Organic Report (continued)', COLORS.secondary);
          yPos = 30;
        }
        doc.text(safeText(`- ${insight}`), 25, yPos);
        yPos += 5;
      });

      yPos += 5;

      // Key Takeaway
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(102, 126, 234);
      doc.text('Key Takeaway:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      let takeaway = '';
      if (topPost.isVideo && topPost.views > 1000) {
        takeaway = `Video content (#${topPost.index}) drove the highest engagement with ${topPost.views.toLocaleString()} views. Consider creating more video content.`;
      } else if (!topPost.isVideo && topPost.engagementRate > 4) {
        takeaway = `Image content (#${topPost.index}) achieved the highest engagement rate (${topPost.engagementRate.toFixed(1)}%). Focus on similar visual style and timing.`;
      } else {
        takeaway = `Post #${topPost.index} (${topPost.mediaType}) performed best with ${topPost.engagementRate.toFixed(1)}% engagement rate. Analyze its content strategy for replication.`;
      }

      doc.text(sanitizeText(takeaway), 25, yPos, { maxWidth: pageWidth - 50 });
      yPos += 10;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.text.secondary);
      doc.text(safeText('Strategic Note: Timelines assume continued posting volume similar to current period. Execution strategy optimized for observed engagement patterns.'), 20, yPos);
      yPos += 10;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.text.light);
      doc.text('* Note: "N/A" views indicates platform data limitation for static image posts.', 20, yPos);
      yPos += 10;
    }

    // Top 5 Stories Section REMOVED per user request
    // Code for Top 5 Stories table has been deleted.

    return yPos;
  };

  // Helper function to pre-load images with better error handling
  const preloadImages = async (posts) => {
    const imageCache = new Map();

    // Load images in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      const loadPromises = batch.map(async (post, batchIndex) => {
        const actualIndex = i + batchIndex;
        // Try multiple URL sources
        const imgUrl = post.thumbnailUrl || post.thumbnail_url || post.media_url || post.image_url || '';

        if (!imgUrl || (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:'))) {
          console.warn(`Post ${actualIndex} has no valid image URL: ${imgUrl}`);
          // Provide a tiny transparent placeholder instead of null to avoid "white space" gaps if possible
          return { index: actualIndex, image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' };
        }

        try {
          return new Promise((resolve) => {
            // If already base64, use directly
            if (imgUrl.startsWith('data:')) {
              resolve({ index: actualIndex, image: imgUrl });
              return;
            }

            const img = new Image();
            // Try anonymous CORS first
            img.crossOrigin = 'anonymous';

            const timeout = setTimeout(() => {
              console.warn(`Image ${actualIndex} load timeout: ${imgUrl.substring(0, 50)}...`);
              resolve({ index: actualIndex, image: null });
            }, 6000); // Increased timeout to 6 seconds

            img.onload = () => {
              clearTimeout(timeout);
              try {
                // Create canvas and resize to thumbnail size (200x200 for quality)
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;

                // Maintain aspect ratio
                if (width > height) {
                  if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                  }
                } else {
                  if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Fill white background for transparency issues
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 JPEG with good quality
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                resolve({ index: actualIndex, image: base64 });
              } catch (e) {
                console.warn(`Failed to convert image ${actualIndex} to base64:`, e);
                resolve({ index: actualIndex, image: null });
              }
            };

            img.onerror = (error) => {
              clearTimeout(timeout);
              console.warn(`Failed to load image ${actualIndex}: ${imgUrl.substring(0, 50)}...`, error);
              // Try without CORS as fallback (for same-origin images)
              if (img.crossOrigin === 'anonymous') {
                const img2 = new Image();
                img2.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img2.width;
                    canvas.height = img2.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img2, 0, 0);
                    const base64 = canvas.toDataURL('image/jpeg', 0.85);
                    resolve({ index: actualIndex, image: base64 });
                  } catch (e) {
                    resolve({ index: actualIndex, image: null });
                  }
                };
                img2.onerror = () => resolve({ index: actualIndex, image: null });
                img2.src = imgUrl;
              } else {
                resolve({ index: actualIndex, image: null });
              }
            };

            // Try loading with CORS
            img.src = imgUrl;
          });
        } catch (error) {
          return { index: actualIndex, image: null };
        }
      });

      const batchResults = await Promise.all(loadPromises);
      batchResults.forEach(({ index, image }) => {
        if (image) {
          imageCache.set(index, image);
        }
      });
    }

    return imageCache;
  };

  const generateContentPerformanceSection = async (doc, report, startY, drawSectionHeader, pageHeight) => {
    let yPos = startY;

    // Validate report structure
    if (!report) {
      throw new Error('Report is null or undefined');
    }

    if (!report.account) {
      console.warn('Report missing account information:', report);
      report.account = { account_name: 'Unknown Account' };
    }

    const data = report.data || {};
    const postsArray = Array.isArray(data.posts) ? data.posts : [];
    const accountName = report.account?.account_name || 'Unknown Account';
    const pageWidth = doc.internal.pageSize.getWidth();

    console.log('🔍 Generating Content Performance Section:', {
      hasReport: !!report,
      hasAccount: !!report.account,
      accountName: report.account?.account_name,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      postsCount: data.posts ? (Array.isArray(data.posts) ? data.posts.length : 'not an array') : 0,
      postsType: Array.isArray(data.posts) ? 'array' : typeof data.posts,
      storiesCount: data.stories ? (Array.isArray(data.stories) ? data.stories.length : 'not an array') : 0
    });

    if (!data || typeof data !== 'object') {
      console.warn('Invalid report data structure, using empty object');
      // Don't throw - continue with empty data
    }

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x, y, width, height, radius, mode) => {
      try {
        if (typeof doc.roundedRect === 'function') {
          doc.roundedRect(x, y, width, height, radius, radius, mode);
        } else {
          doc.rect(x, y, width, height, mode);
        }
      } catch (e) {
        doc.rect(x, y, width, height, mode);
      }
    };

    // Summary table
    if (yPos > pageHeight - 100) {
      doc.addPage();
      const accountName = report.account?.account_name || 'Unknown Account';
      drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
      yPos = 30;
    }

    // Subsection header (H2)
    yPos = drawSubsectionHeader(doc, 'Content Overview', yPos, COLORS.text.primary);
    yPos += 5;

    // Level 1: Key Decision Signals
    let dataY = yPos;
    const statsX = 20;
    const colWidth = (pageWidth - 40) / 3;

    drawImpactMetric(doc, statsX, dataY, 'Post ER (Avg)', formatPercentage(postsArray.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / (postsArray.length || 1), 2), COLORS.accent);
    drawImpactMetric(doc, statsX + colWidth, dataY, 'Total Views', formatNumber(postsArray.reduce((sum, p) => sum + (p.views || 0), 0) || 0), COLORS.secondary);
    drawImpactMetric(doc, statsX + colWidth * 2, dataY, 'Published', formatNumber(data.total_posts || 0), COLORS.secondary);
    yPos += 35;



    console.log('📊 Posts data check:', {
      hasPosts: !!data.posts,
      isArray: Array.isArray(data.posts),
      postsCount: postsArray.length,
      postsSample: postsArray.length > 0 ? postsArray[0] : null
    });

    if (postsArray.length > 0) {
      try {
        const pageHeight = doc.internal.pageSize.getHeight();

        // Check if we need a new page
        if (yPos > pageHeight - 100) {
          doc.addPage();
          const accountName = report.account?.account_name || 'Unknown Account';
          drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
          yPos = 30;
        }

        // Subsection header (H2)
        yPos = drawSubsectionHeader(doc, 'Content Performance Leaderboard', yPos, COLORS.text.primary);
        yPos += 5;

        // Add sorting explanation
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...COLORS.text.secondary);
        doc.text(safeText('Posts sorted by date (newest first). Views: "Not tracked for image posts" indicates static image format.'), 20, yPos);
        yPos += 8;

        // Prepare posts data - Simplified to reduce columns and prevent breaking
        // Split into two tables: Basic Metrics and Engagement Metrics
        const postsData = postsArray.map((post, index) => {
          const mediaType = (post.media_type || 'IMAGE').toUpperCase();
          // Format date like "Dec 12, 2025"
          let date = 'N/A';
          if (post.timestamp) {
            try {
              const postDate = new Date(post.timestamp);
              date = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch (e) {
              date = 'N/A';
            }
          }
          // Description - clean and truncate more aggressively for PDF
          let caption = post.caption || post.description || '';
          if (caption) {
            // Use safe sanitization instead of tempDiv which can be unreliable
            caption = sanitizeText(caption);
          }
          // Much shorter description for table - max 40 chars
          const description = caption.length > 40 ? caption.substring(0, 37) + '...' : caption || 'No desc';

          // View display logic - strictly use processed views
          let viewsDisplay = post.views > 0 ? post.views.toLocaleString() : 'N/A';

          return {
            rowData: [
              description,
              date,
              mediaType.charAt(0) + mediaType.slice(1).toLowerCase(),
              (post.likes || 0).toLocaleString(),
              (post.comments || 0).toLocaleString(),
              ((post.likes || 0) + (post.comments || 0)).toLocaleString(),
              post.engagement_rate ? (post.engagement_rate.toFixed(2) + '%') : '0.00%'
            ],
            thumbnailUrl: post.thumbnail_url || post.media_url || '',
            mediaType: mediaType,
            date: date,
            fullDescription: caption,
            saved: (post.saved || 0),
            shares: (post.shares || 0),
            permalink: post.permalink || post.media_url || '',
            engagementRate: post.engagement_rate ? parseFloat(post.engagement_rate) : 0,
            views: post.views || 0,
            performanceReason: (post.engagement_rate || 0) > 3 ? 'High Engagement' : 'Standard Performance'
          };
        });

        // Calculate best/worst posts for analysis (Fixes ReferenceError)
        const sortedByER = [...postsData].sort((a, b) => b.engagementRate - a.engagementRate);
        const bestPost = sortedByER.length > 0 ? sortedByER[0] : null;
        const worstPost = sortedByER.length > 0 ? sortedByER[sortedByER.length - 1] : null;

        // Pre-load all images before rendering (with error handling)
        let imageCache = new Map();
        try {
          console.log('🖼️ Pre-loading images for', postsData.length, 'posts...');
          imageCache = await preloadImages(postsData);
          console.log('✅ Loaded', imageCache.size, 'images successfully');
        } catch (imageError) {
          console.warn('⚠️ Image pre-loading failed, continuing without images:', imageError);
          // Continue without images - will use placeholders
        }

        // STRICT Thumbnail Drawer (Shared Logic)
        const drawThumbnailCell = (cellData) => {
          if (cellData.section !== 'body' || cellData.column.index !== 0) return;

          const post = postsData[cellData.row.index]; // Note: This index might need adjustment if using slice
          // Actually, autoTable hookData.row.index is relative to the provided body
          // If we split the body, we need to map back to original data or pass correct data objects
          // Let's rely on the row object having the original index or similar, OR just trust strict order

          // Better approach: Since we slice postsData for body, the row index corresponds to the slice.
          // However, imageCache uses original index? 
          // Let's check preloadImages. It likely uses index from the array passed to it.
          // postsData was passed to preloadImages.
          // So if we slice, we have to be careful.

          // PROPOSAL: Use the data object directly if possible, or mapping.
          // But autoTable body is just an array of rowData arrays.

          // SIMPLE FIX: Just use the cached image logic with strict checks.
          // We can pass the 'post' object via didDrawCell using global tracking? No.
          // We can recover the post if we know the offset.
        };

        // Re-implementing strict drawer with OFFSET support
        const drawThumbnailCellWithOffset = (offset) => (cellData) => {
          if (cellData.section !== 'body' || cellData.column.index !== 0) return;

          const relativeIndex = cellData.row.index;
          const absoluteIndex = offset + relativeIndex;
          const post = postsData[absoluteIndex];
          if (!post) return;

          const thumbSize = 12;
          const cell = cellData.cell;
          const x = cell.x + 2;
          const y = cell.y + (cell.height - thumbSize) / 2;

          cell.text = ''; // Clear text

          const cachedImage = imageCache.get(absoluteIndex); // Use absolute index
          const isVideo = (post.mediaType === 'VIDEO' || post.mediaType === 'REELS');

          if (cachedImage) {
            try {
              doc.addImage(cachedImage, 'JPEG', x, y, thumbSize, thumbSize, undefined, 'FAST');
              doc.setDrawColor(220, 220, 220);
              doc.setLineWidth(0.1);
              doc.rect(x, y, thumbSize, thumbSize, 'D');
            } catch (e) {
              doc.setFillColor(245, 245, 245);
              doc.rect(x, y, thumbSize, thumbSize, 'F');
            }
          } else {
            doc.setFillColor(245, 245, 245);
            doc.rect(x, y, thumbSize, thumbSize, 'F');
          }

          if (isVideo) {
            doc.setFillColor(236, 72, 153);
            doc.circle(x + thumbSize - 2, y + 2, 1.5, 'F');
          }
        };

        // 1. Strategic Content Analysis
        yPos = drawSubsectionHeader(doc, 'Strategic Content Analysis', yPos, COLORS.accent);

        const contentInsight = bestPost
          ? `High Performance Detected: Content focusing on ${bestPost.performanceReason || 'Current Format'} is generating ${bestPost.engagementRate.toFixed(1)}% resonance. Recommendations: Leverage similar visual hooks and engagement-focused copy to sustain this baseline.`
          : 'Content performance is stable across all formats; no extreme outliers detected. Recommendations: Experiment with interactive polls or reels to identify new growth levers.';

        yPos = drawWrappedText(doc, contentInsight, SAFE_MARGINS.left, yPos, pageWidth - SAFE_MARGINS.left - SAFE_MARGINS.right, {
          fontSize: TYPOGRAPHY.body.size,
          color: COLORS.text.secondary
        });
        yPos += 10;

        // TABLE A: Top 5 Performers (Page 1)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text.primary);
        doc.text('Top 5 Performing Posts', 20, yPos - 2);

        autoTable(doc, {
          startY: yPos,
          head: [['Creative', 'Date', 'Type', 'Likes', 'Comments', 'Eng', 'ER%']],
          body: postsData.slice(0, 5).map(p => p.rowData),
          theme: 'striped',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: COLORS.text.primary,
            lineWidth: 0.1,
            lineColor: [230, 235, 240],
            minCellHeight: 16,
            valign: 'middle'
          },
          headStyles: {
            fillColor: COLORS.secondary, // Teal Header (Rule of 3)
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 40, halign: 'left', cellPadding: { left: 16 } },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
            6: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: COLORS.accent }
          },
          didDrawCell: drawThumbnailCellWithOffset(0), // Offset 0
          didParseCell: (hookData) => {
            if (hookData.column.index === 0 && hookData.cell.text && hookData.cell.section === 'body') {
              const text = hookData.cell.text[0] || '';
              if (text.length > 32) hookData.cell.text = [text.substring(0, 30) + '...'];
            }
          },
          margin: { left: 20, right: 20 }
        });

        yPos = doc.lastAutoTable.finalY + 12; // Safety margin

        // TABLE B: Remaining Posts (Page 2 - if strictly needed or implied by "Split")
        // User said: "Page 1: Top 5 posts, Page 2: Remaining posts"
        // Let's implement this.
        if (postsData.length > 5) {
          doc.addPage();
          drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.secondary);
          yPos = 60; // Start normal

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Remaining Content List', 20, yPos - 2);

          autoTable(doc, {
            startY: yPos,
            head: [['Creative', 'Date', 'Type', 'Likes', 'Comments', 'Eng', 'ER%']],
            body: postsData.slice(5).map(p => p.rowData),
            theme: 'striped',
            styles: {
              fontSize: 9,
              cellPadding: 3,
              textColor: COLORS.text.primary,
              minCellHeight: 16,
              valign: 'middle'
            },
            headStyles: {
              fillColor: [100, 116, 139], // Slate for secondary table
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 9,
              halign: 'center'
            },
            columnStyles: {
              0: { cellWidth: 40, halign: 'left', cellPadding: { left: 16 } },
              1: { cellWidth: 20, halign: 'center' },
              2: { cellWidth: 15, halign: 'center' },
              3: { cellWidth: 20, halign: 'right' },
              4: { cellWidth: 20, halign: 'right' },
              5: { cellWidth: 20, halign: 'right' },
              6: { cellWidth: 20, halign: 'right' }
            },
            didDrawCell: drawThumbnailCellWithOffset(5), // Offset 5
            didParseCell: (hookData) => {
              if (hookData.column.index === 0 && hookData.cell.text && hookData.cell.section === 'body') {
                const text = hookData.cell.text[0] || '';
                if (text.length > 32) hookData.cell.text = [text.substring(0, 30) + '...'];
              }
            },
            margin: { left: 20, right: 20 }
          });

          yPos = doc.lastAutoTable.finalY + 15;
        } else {
          // Keep current yPos if second table was skipped
        }

        yPos = ensureSpace(doc, yPos, 45, pageHeight, accountName, COLORS.accent);
        yPos = drawSubsectionHeader(doc, 'Action Plan: What to Optimize', yPos, COLORS.accent);

        const actionPlanItems = [
          { bold: 'FIX:', text: `Focus on ${bestPost?.mediaType || 'Current'} formats which exceed ${bestPost?.engagementRate.toFixed(1) || 3}% engagement.` },
          { bold: 'STOP:', text: worstPost ? `Pause low-resonance ${worstPost.mediaType} content showing less than 1% interaction.` : 'Deprioritize content that fails to generate comments.' },
          { bold: 'ADVANCE:', text: 'Test increased story frequency to drive daily brand touchpoints.' }
        ];

        actionPlanItems.forEach(item => {
          doc.setFontSize(TYPOGRAPHY.body.size);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.accent);
          doc.text(item.bold, 25, yPos);

          const labelWidth = doc.getTextWidth(item.bold) + 2;
          yPos = drawWrappedText(doc, item.text, 25 + labelWidth, yPos, pageWidth - 35 - labelWidth, {
            fontSize: TYPOGRAPHY.body.size,
            style: 'normal',
            color: COLORS.text.primary
          });
        });

        yPos += 5;

        yPos += 15;

        // Add insights section for Content Performance
        if (yPos > pageHeight - 100) {
          doc.addPage();
          const accountName = report.account?.account_name || 'Unknown Account';
          drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
          yPos = 30;
        }

        // Content Performance Insights
        drawCardTitle(doc, 'Content Performance Insights', 20, yPos);
        yPos += 8;

        // Analyze posts
        const highPerformers = postsArray.filter(p => {
          const er = p.engagement_rate || 0;
          return er > 3;
        });
        const lowPerformers = postsArray.filter(p => {
          const er = p.engagement_rate || 0;
          return er < 1;
        });
        const videoPosts = postsArray.filter(p => (p.media_type || '').toUpperCase() === 'VIDEO' || (p.media_type || '').toUpperCase() === 'REELS');
        const imagePosts = postsArray.filter(p => (p.media_type || '').toUpperCase() === 'IMAGE');
        const avgER = postsArray.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / (postsArray.length || 1);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.primary);

        // What worked - SANITIZED
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.success);
        doc.text(safeText('What Worked:'), 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.primary);

        const workedInsights = [];
        if (highPerformers.length > 0) {
          workedInsights.push(`${highPerformers.length} post(s) achieved >3% engagement rate - excellent performance`);
        }
        if (videoPosts.length > 0 && imagePosts.length > 0) {
          const videoAvgER = videoPosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / videoPosts.length;
          const imageAvgER = imagePosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / imagePosts.length;
          if (videoAvgER > imageAvgER) {
            workedInsights.push(`Videos outperformed images (${videoAvgER.toFixed(1)}% vs ${imageAvgER.toFixed(1)}% avg ER)`);
          } else if (imageAvgER > videoAvgER) {
            workedInsights.push(`Images outperformed videos (${imageAvgER.toFixed(1)}% vs ${videoAvgER.toFixed(1)}% avg ER)`);
          }
        }
        if (avgER > 2) {
          workedInsights.push(`Average engagement rate of ${avgER.toFixed(1)}% across all posts`);
        }

        if (workedInsights.length === 0) {
          workedInsights.push('Content shows consistent engagement patterns');
        }

        workedInsights.forEach((insight) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            const accountName = report.account?.account_name || 'Unknown Account';
            drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
            yPos = 30;
          }
          doc.text(safeText(`- ${insight}`), 25, yPos);
          yPos += 5;
        });

        yPos += 8;

        // What didn't work - SANITIZED
        if (lowPerformers.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.error);
          doc.text(safeText('What Needs Improvement:'), 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.text.primary);

          doc.text(safeText(`- ${lowPerformers.length} post(s) had less than 1% engagement rate - review content strategy`), 25, yPos);
          yPos += 5;
        }

        yPos += 8;

        // Next steps - SANITIZED
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.secondary);
        doc.text(safeText('Next Steps:'), 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.primary);

        const nextSteps = [];
        if (highPerformers.length > 0) {
          nextSteps.push('Replicate successful content formats and posting times');
        }
        if (videoPosts.length > 0 && videoPosts.length < imagePosts.length) {
          nextSteps.push('Consider increasing video content production');
        }
        if (avgER < 2) {
          nextSteps.push('Focus on improving engagement through better captions and timing');
        }
        if (nextSteps.length === 0) {
          nextSteps.push('Continue monitoring performance and optimize based on top performers');
        }

        nextSteps.forEach((step) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            const accountName = report.account?.account_name || 'Unknown Account';
            drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
            yPos = 30;
          }
          doc.text(safeText(`- ${step}`), 25, yPos);
          yPos += 5;
        });

        yPos += 8;

        // Content Performance Analysis Summary
        if (yPos > pageHeight - 60) {
          doc.addPage();
          const accountName = report.account?.account_name || 'Unknown Account';
          drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
          yPos = 30;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...COLORS.text.secondary);
        doc.text(safeText(`Statistical Note: Based on limited sample size (${postsData.length} posts), early patterns suggest the following performance trends.`), 20, yPos);
        yPos += 10;

        drawCardTitle(doc, 'Performance Summary', 20, yPos);
        yPos += 8;



        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text.primary);
        doc.text('Key Performance Highlights:', 20, yPos);
        yPos += 8;

        const avgPostER = postsArray.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / (postsArray.length || 1);
        const erInsights = [
          `Takeaway: Content drives ${avgPostER.toFixed(2)}% average resonance across ${postsData.length} posts.`,
          `High Performer: Best post achieved a peak of ${bestPost ? bestPost.engagementRate.toFixed(2) + '%' : 'N/A'} ER.`,
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text.secondary);
        erInsights.forEach(line => {
          doc.text(safeText(line), 25, yPos);
          yPos += 6;
        });

        yPos += 15;

        yPos += 10;
        console.log('✅ Posts Performance table rendered successfully with', postsData.length, 'posts');
        console.log('✅ Posts Performance table rendered successfully with', postsData.length, 'posts');
      } catch (tableError) {
        console.error('❌ Error rendering Posts Performance table:', tableError);
        // Add error message to PDF (User-facing and safe)
        doc.setFontSize(11);
        doc.setTextColor(180, 0, 0);
        doc.setFont('helvetica', 'italic');
        doc.text('Posts performance breakdown unavailable due to insufficient per-post data.', 20, yPos);
        yPos += 15;
      }
    } else {
      // Log if no posts found
      console.warn('⚠️ No posts found in content performance data:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        postsType: typeof data.posts,
        postsValue: data.posts
      });

      // Still add a message in the PDF
      if (yPos > pageHeight - 100) {
        doc.addPage();
        const accountName = report.account?.account_name || 'Unknown Account';
        drawSectionHeader(doc, accountName + ' - Content Performance (continued)', COLORS.accent);
        yPos = 30;
      }

      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('No posts data available for this period.', 20, yPos);
      yPos += 10;
    }

    // Stories Table REMOVED per user request
    // Code for Stories Performance table has been deleted.

    return yPos;
  };

  const generateCampaignReportSection = (doc, report, startY, drawSectionHeader, pageHeight) => {
    let yPos = startY;

    // Validate report structure
    if (!report) {
      throw new Error('Report is null or undefined');
    }

    if (!report.account) {
      console.warn('Report missing account information:', report);
      report.account = { account_name: 'Unknown Account', client_name: 'Unknown Account' };
    }

    const data = report.data || {};
    const pageWidth = doc.internal.pageSize.getWidth();
    const accountName = report.account?.account_name || 'Account';

    // Summary table
    yPos = ensureSpace(doc, yPos, 80, pageHeight, accountName, COLORS.accent);

    if (data.summary) {
      // 1. Capital Strategy & Efficiency
      yPos = drawSubsectionHeader(doc, 'Capital Strategy & Efficiency', yPos, COLORS.text.primary);

      const calcCPM = (data.summary.total_impressions || 0) > 0
        ? (data.summary.total_spend / data.summary.total_impressions) * 1000
        : 0;
      const calcCPC = (data.summary.total_clicks || 0) > 0
        ? data.summary.total_spend / data.summary.total_clicks
        : 0;

      const efficiencyInsight = data.summary.total_spend > 0
        ? `Ad investment is generating specialized touchpoints at ${formatCurrency(calcCPC, data.account_currency || 'INR', 2)} per click. The current CPM baseline of ${formatCurrency(calcCPM, data.account_currency || 'INR', 2)} indicates competitive placement efficiency.${data.summary.total_leads === 0 ? ' (Note: Campaigns appear to be awareness-focused as no direct conversions were tracked).' : ''}`
        : 'No active advertising spend detected for this period; organic channels remain the primary reach drivers.';

      yPos = drawWrappedText(doc, efficiencyInsight, SAFE_MARGINS.left, yPos, pageWidth - SAFE_MARGINS.left - SAFE_MARGINS.right, {
        fontSize: TYPOGRAPHY.body.size,
        color: COLORS.text.secondary
      });

      yPos += 10;

      // Primary Analytics Hierarchy
      drawImpactMetric(doc, 20, yPos, 'Total Invested', formatCurrency(data.summary.total_spend || 0, data.account_currency || 'INR'), COLORS.accent);
      drawImpactMetric(doc, pageWidth / 2 - 15, yPos, 'Paid Reach', formatNumber(data.summary.total_reach || 0), COLORS.secondary);
      drawImpactMetric(doc, pageWidth - 70, yPos, 'Efficiency (CTR)', formatPercentage(data.summary.avg_ctr || 0, 2), COLORS.secondary);
      yPos += 35;

      const summaryData = [
        ['Cost Per Click (CPC)', formatCurrency(calcCPC, data.account_currency || 'INR', 2)],
        ['Cost Per 1k Views (CPM)', formatCurrency(calcCPM, data.account_currency || 'INR', 2)],
        ['Total Engagement', formatNumber(data.summary.total_engagement || 0)],
        ['Total Reach', formatNumber(data.summary.total_reach || 0)],
        ['Total Clicks', formatNumber(data.summary.total_clicks || 0)],
        ['Total Lead Conversions', formatNumber(data.summary.total_leads || 0)],
      ];

      yPos = drawProfessionalTable(doc, yPos, ['Efficiency Metric', 'Observed Value'], summaryData, {
        headerColor: COLORS.accent,
        highlightIndex: 1,
        fontSize: 8
      });

      yPos += 10;
    }

    // Campaigns List
    if (data.campaigns && data.campaigns.length > 0) {
      yPos = ensureSpace(doc, yPos, 60, pageHeight, accountName, COLORS.accent);
      yPos = drawSubsectionHeader(doc, `Campaign Performance Overview`, yPos, COLORS.text.primary);

      const campaignsData = data.campaigns.slice(0, 5).map((campaign, index) => [
        (index + 1).toString(),
        (campaign.name || 'N/A').substring(0, 25),
        formatCurrency(campaign.metrics?.spend || 0, campaign.metrics?.currency || 'INR'),
        formatNumber(campaign.metrics?.reach || 0),
        formatNumber(campaign.metrics?.engagement || 0),
        formatPercentage(campaign.metrics?.ctr || 0)
      ]);

      yPos = drawProfessionalTable(doc, yPos, ['#', 'Campaign Name (Top 5)', 'Spend', 'Reach', 'Eng.', 'CTR'], campaignsData, {
        headerColor: COLORS.accent,
        fontSize: 8
      });
    }

    return yPos;
  };

  // formatCurrency is already defined at module level, using that instead

  const getAccountIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'instagram':
        return <Instagram />;
      case 'facebook':
        return <Facebook />;
      default:
        return <CampaignIcon />;
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          📄 Custom Report Builder
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select accounts and report types to generate a combined PDF document
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Selection */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Select Accounts (for Organic & Content Performance)
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List>
                {accounts.map((account) => (
                  <ListItem key={account.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleAccountToggle(account.id)}
                      selected={selectedAccounts.includes(account.id)}
                    >
                      <ListItemIcon>
                        {selectedAccounts.includes(account.id) ? (
                          <CheckCircle color="primary" />
                        ) : (
                          <RadioButtonUnchecked />
                        )}
                      </ListItemIcon>
                      <ListItemIcon>
                        {getAccountIcon(account.platform)}
                      </ListItemIcon>
                      <ListItemText
                        primary={account.account_name}
                        secondary={account.platform.toUpperCase()}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              {accounts.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No accounts available. Please connect accounts first.
                </Alert>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Select Ad Accounts (for Campaign Analytics)
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List>
                {adAccounts.map((adAccount) => (
                  <ListItem key={adAccount.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleAdAccountToggle(adAccount.id)}
                      selected={selectedAdAccounts.includes(adAccount.id)}
                    >
                      <ListItemIcon>
                        {selectedAdAccounts.includes(adAccount.id) ? (
                          <CheckCircle color="secondary" />
                        ) : (
                          <RadioButtonUnchecked />
                        )}
                      </ListItemIcon>
                      <ListItemIcon>
                        <CampaignIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={adAccount.client_name || adAccount.account_name || adAccount.ad_account_id}
                        secondary={`Ad Account: ${adAccount.ad_account_id}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              {adAccounts.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No ad accounts available. Campaign Analytics requires ad accounts.
                </Alert>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Select Report Types
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedReportTypes.organic}
                    onChange={() => handleReportTypeToggle('organic')}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment />
                    <Typography>Organic Report</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedReportTypes.content_performance}
                    onChange={() => handleReportTypeToggle('content_performance')}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChart />
                    <Typography>Content Performance</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedReportTypes.campaigns}
                    onChange={() => handleReportTypeToggle('campaigns')}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CampaignIcon />
                    <Typography>Campaign Analytics</Typography>
                  </Box>
                }
              />
            </FormGroup>
          </Paper>
        </Grid>

        {/* Right Column - Date Range and Generate */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Date Range
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Selected Configuration
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Selected Accounts ({selectedAccounts.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAccounts.map(accountId => {
                  const account = accounts.find(acc => acc.id === accountId);
                  return account ? (
                    <Chip
                      key={accountId}
                      label={account.account_name}
                      icon={getAccountIcon(account.platform)}
                      onDelete={() => handleAccountToggle(accountId)}
                      color="primary"
                      variant="outlined"
                    />
                  ) : null;
                })}
                {selectedAccounts.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No accounts selected
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Selected Ad Accounts ({selectedAdAccounts.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAdAccounts.map(adAccountId => {
                  const adAccount = adAccounts.find(acc => acc.id === adAccountId);
                  return adAccount ? (
                    <Chip
                      key={adAccountId}
                      label={adAccount.client_name || adAccount.account_name || adAccount.ad_account_id}
                      icon={<CampaignIcon />}
                      onDelete={() => handleAdAccountToggle(adAccountId)}
                      color="secondary"
                      variant="outlined"
                    />
                  ) : null;
                })}
                {selectedAdAccounts.length === 0 && selectedReportTypes.campaigns && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Campaign Analytics requires ad accounts. Please select at least one ad account.
                  </Alert>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Selected Report Types ({Object.values(selectedReportTypes).filter(Boolean).length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedReportTypes.organic && (
                  <Chip label="Organic Report" color="primary" />
                )}
                {selectedReportTypes.content_performance && (
                  <Chip label="Content Performance" color="success" />
                )}
                {selectedReportTypes.campaigns && (
                  <Chip label="Campaign Analytics" color="secondary" />
                )}
                {Object.values(selectedReportTypes).every(v => !v) && (
                  <Typography variant="body2" color="text.secondary">
                    No report types selected
                  </Typography>
                )}
              </Box>
            </Box>

            {generating && (
              <Box sx={{ mb: 3 }}>
                <Alert severity="info">
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {progress.message}
                  </Typography>
                  {progress.total > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">
                        {progress.current} / {progress.total} reports fetched
                      </Typography>
                    </Box>
                  )}
                </Alert>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
              onClick={generateCombinedPDF}
              disabled={generating ||
                (selectedAccounts.length === 0 && selectedAdAccounts.length === 0) ||
                Object.values(selectedReportTypes).every(v => !v) ||
                !startDate || !endDate ||
                (selectedReportTypes.campaigns && selectedAdAccounts.length === 0)}
              sx={{ height: '56px', fontSize: '1.1rem' }}
            >
              {generating ? 'Generating Report...' : 'Generate Combined PDF Report'}
            </Button>

            {((selectedAccounts.length > 0 || selectedAdAccounts.length > 0) && Object.values(selectedReportTypes).some(v => v)) && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                This will generate a PDF with:
                {selectedReportTypes.organic && selectedAccounts.length > 0 && ` ${selectedAccounts.length} organic report(s)`}
                {selectedReportTypes.content_performance && selectedAccounts.length > 0 && ` ${selectedAccounts.length} content performance report(s)`}
                {selectedReportTypes.campaigns && selectedAdAccounts.length > 0 && ` ${selectedAdAccounts.length} campaign report(s)`}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomReportBuilder;

