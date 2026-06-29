
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  LinearProgress,
  Alert,
  Tooltip as MuiTooltip,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Assessment,
  Instagram,
  Facebook,
  Print,
  People,
  ArrowBack,
  TrendingUp,
  Settings,
  PictureAsPdf,
  Visibility,
  Favorite,
  ChatBubble,
  Share,
  Bookmark,
  PlayArrow,
  Image as ImageIcon,
  OpenInNew,
  DateRange,
  Delete,
  ViewCarousel
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import UnifiedAccountManager from './UnifiedAccountManager';
import { reportsAPI } from '../services/api';

// --- COLORS & STYLES ---
const COLORS = ['#1a237e', '#E65100', '#FFBB28', '#FF8042', '#00C49F', '#0088FE'];

const PerformanceSummaryReport = () => {
  // --- UI STATE ---
  const [accountManagerOpen, setAccountManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // --- DATA STATE ---
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentReports, setRecentReports] = useState([]);
  
  // Date State (Defaults to last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Frequency comparison state
  const [periodType, setPeriodType] = useState('monthly'); // 'weekly', 'monthly', 'quarterly'
  const [comparisonData, setComparisonData] = useState(null); // Stores current vs previous period comparison
  const [showComparison, setShowComparison] = useState(false);

  // Report Content State
  const [reportData, setReportData] = useState({
    account: null,
    organicStats: null,
    organicData: null, // Full organic data from API
    adsData: null,
    posts: [],
    postsData: null, // Full posts data structure from API
    demographics: { age: [], gender: [] },
    engagementBreakdown: { likes: 0, comments: 0, shares: 0, saves: 0 },
    contentMetrics: { totalPosts: 0, totalStories: 0, avgEngagementRate: 0 }
  });
  
  // Editable Executive Summary
  const [summaryText, setSummaryText] = useState(
    "Engagement remains strong this period. We observed consistent growth in reach and positive audience sentiment across key content pillars."
  );

  // --- 1. LOAD ACCOUNTS ON MOUNT ---
  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/accounts.php`);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchRecentReports();
  }, []);

  // Fetch recent reports
  const fetchRecentReports = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reports.php/reports`);
      if (response.data.success) {
        // Filter for content_performance and organic reports, sort by date
        const reports = (response.data.data || [])
          .filter(r => r.type === 'content_performance' || r.type === 'organic')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10); // Get latest 10
        setRecentReports(reports);
      }
    } catch (error) {
      console.error("Error fetching recent reports:", error);
    }
  };

  // --- 2. ENHANCED GENERATE REPORT LOGIC ---
  const handleGenerateReport = async () => {
    if (!selectedAccountId) {
      alert("Please select an account first.");
      return;
    }

    setLoading(true);
    
    try {
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      
      const newReportData = {
        account: selectedAccount,
        organicStats: null,
        organicData: null,
        adsData: null,
        posts: [],
        demographics: { age: [], gender: [] },
        engagementBreakdown: { likes: 0, comments: 0, shares: 0, saves: 0 },
        contentMetrics: { totalPosts: 0, totalStories: 0, avgEngagementRate: 0 }
      };

      // A. FETCH UNIFIED ORGANIC DATA (Account Stats + Content + Stories)
      try {
        console.log(`Fetching unified organic report for account: ${selectedAccount.account_name} (ID: ${selectedAccountId})`);
        const unifiedResponse = await reportsAPI.getUnifiedOrganic(
          selectedAccountId,
          startDate,
          endDate,
          { includePosts: true, includeStories: true, postsLimit: 50 }
        );
        
        console.log("Unified organic response:", unifiedResponse.data);
        
        // Check if response is successful
        if (unifiedResponse.data.success) {
          const unifiedData = unifiedResponse.data.data;
          
          // Validate response data structure
          if (!unifiedData || typeof unifiedData !== 'object') {
            console.warn("Invalid response data structure:", unifiedData);
            const errorMsg = unifiedResponse.data?.error || "Invalid data structure returned from API";
            alert(`Warning: Could not fetch organic data for ${selectedAccount.account_name}.\n\nError: ${errorMsg}`);
            // Continue with empty data - don't block report generation
            newReportData.organicStats = {
              followers: selectedAccount.followers_count || 0,
              impressions: 0,
              reach: 0,
              profile_views: 0,
              engagement: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              website_clicks: 0,
              email_clicks: 0,
              posts_count: 0
            };
            newReportData.stories = { total_posted: 0, total_views: 0, total_replies: 0, avg_views: 0, stories_list: [] };
          } else {
            // The unified API returns a structured response with account_stats, engagement, content_posts, stories
            newReportData.organicData = unifiedData;
            
            // Extract data from unified response structure
            const accountStats = unifiedData.account_stats || {};
            const engagement = unifiedData.engagement || {};
            const contentPosts = unifiedData.content_posts || [];
            const stories = unifiedData.stories || { total_posted: 0, total_views: 0, total_replies: 0, avg_views: 0, stories_list: [] };
            
            // Set account stats
            newReportData.organicStats = {
              followers: accountStats.followers || selectedAccount.followers_count || 0,
              following: accountStats.following || 0,
              posts_count: accountStats.posts_count || contentPosts.length || 0,
              profile_views: accountStats.profile_views || 0,
              website_clicks: accountStats.website_clicks || 0,
              email_clicks: accountStats.email_clicks || 0,
              impressions: engagement.impressions || 0,
              reach: engagement.reach || 0,
              engagement: engagement.total_engagement || 0,
              likes: engagement.likes || 0,
              comments: engagement.comments || 0,
              shares: engagement.shares || 0,
              saves: engagement.saves || 0,
            };
            
            // Set engagement breakdown
            newReportData.engagementBreakdown = {
              likes: engagement.likes || 0,
              comments: engagement.comments || 0,
              shares: engagement.shares || 0,
              saves: engagement.saves || 0
            };
            
            // Set content posts
            newReportData.posts = contentPosts;
            newReportData.postsData = { posts: contentPosts, total_posts: contentPosts.length };
            
            // Set stories data
            newReportData.stories = stories;
            
            // Set content metrics
            const totalPosts = contentPosts.length;
            const avgEngagementRate = totalPosts > 0 && newReportData.organicStats.followers > 0
              ? ((newReportData.organicStats.engagement / (newReportData.organicStats.followers * totalPosts)) * 100).toFixed(2)
              : 0;
            
            newReportData.contentMetrics = {
              totalPosts: totalPosts,
              totalStories: stories.total_posted || 0,
              avgEngagementRate: parseFloat(avgEngagementRate)
            };
            
            console.log("Unified report data extracted:", {
              accountStats,
              engagement,
              postsCount: contentPosts.length,
              storiesCount: stories.total_posted
            });
          }
        } else {
          // Fallback: use defaults if unified endpoint fails
          console.warn("Unified response not successful:", unifiedResponse.data);
          const errorMsg = unifiedResponse.data?.error || "No data returned from API";
          console.error(`Error: Could not fetch unified organic data for ${selectedAccount.account_name}: ${errorMsg}`);
          newReportData.organicStats = {
            followers: selectedAccount.followers_count || 0,
            impressions: 0,
            reach: 0,
            profile_views: 0,
            engagement: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            website_clicks: 0,
            email_clicks: 0,
            posts_count: 0
          };
          newReportData.stories = { total_posted: 0, total_views: 0, total_replies: 0, avg_views: 0, stories_list: [] };
        }
      } catch (e) { 
        console.error(`Could not fetch unified organic data for ${selectedAccount.account_name}:`, e);
        
        // Determine error type and create specific message
        let errorMessage = "Unknown error";
        if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
          errorMessage = "Request timed out. The API is taking too long to respond. This may be due to rate limiting or network issues.";
        } else if (e.code === 'ERR_NETWORK' || e.message?.includes('Network Error')) {
          errorMessage = `Network error. Please check:\n1. Backend server is running (${API_BASE_URL})\n2. Internet connection\n3. CORS settings`;
        } else if (e.response?.data?.error) {
          errorMessage = e.response.data.error;
        } else if (e.response?.status) {
          errorMessage = `HTTP ${e.response.status}: ${e.response.statusText || 'Server error'}`;
        } else {
          errorMessage = e.message || "Unknown error occurred";
        }
        
        // Check if it's a permission error - show less intrusive message
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('(#10)') || errorMessage.includes('does not have permission');
        
        if (isPermissionError) {
          console.warn(`Warning: Could not fetch unified organic data for ${selectedAccount.account_name} (${selectedAccount.platform}).\n\nError: ${errorMessage}`);
          alert(`Warning: Could not fetch organic data for ${selectedAccount.account_name} (${selectedAccount.platform}).\n\nError: ${errorMessage}\n\nReport generation will continue with default values.`);
        } else {
          alert(`Warning: Could not fetch organic data for ${selectedAccount.account_name} (${selectedAccount.platform}).\n\nError: ${errorMessage}`);
        }
        
        // Set default values
        newReportData.organicStats = {
          followers: selectedAccount.followers_count || 0,
          impressions: 0,
          reach: 0,
          profile_views: 0,
          engagement: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          website_clicks: 0,
          email_clicks: 0,
          posts_count: 0
        };
        newReportData.stories = { total_posted: 0, total_views: 0, total_replies: 0, avg_views: 0, stories_list: [] };
      }

      // B. FETCH FREQUENCY COMPARISON (Optional - if periodType is set)
      if (showComparison && periodType) {
        try {
          console.log(`Fetching frequency comparison for ${periodType}`);
          const comparisonResponse = await reportsAPI.getFrequencyComparison(
            selectedAccountId,
            periodType,
            startDate,
            endDate
          );
          
          if (comparisonResponse.data.success) {
            setComparisonData(comparisonResponse.data.data);
            console.log("Comparison data loaded:", comparisonResponse.data.data);
          }
        } catch (e) {
          console.warn("Could not fetch comparison data (non-critical):", e);
          // Don't block report generation if comparison fails
        }
      }

      // C. FETCH ADS DATA (If connected)
      if (selectedAccount.ad_account_id) {
        try {
          const adsResponse = await axios.get(`${API_BASE_URL}/api/campaign_report.php`, {
            params: {
              account_id: selectedAccount.ad_account_id,
              start_date: startDate,
              end_date: endDate
            }
          });
          if (adsResponse.data.success) {
            newReportData.adsData = adsResponse.data.data;
            if (adsResponse.data.data.demographics) {
              newReportData.demographics = adsResponse.data.data.demographics;
            }
          }
        } catch (e) { console.warn("Could not fetch ads", e); }
      }

      // Save unified report to database
      try {
        await axios.post(`${API_BASE_URL}/api/reports.php/reports`, {
          platform: selectedAccount.platform,
          platformId: selectedAccount.account_id,
          startDate: startDate,
          endDate: endDate,
          type: 'unified',
          data: {
            organic: newReportData.organicData,
            posts: newReportData.posts,
            ads: newReportData.adsData
          }
        });
        fetchRecentReports(); // Refresh recent reports list
      } catch (saveError) {
        console.warn("Could not save unified report:", saveError);
      }

      // Finalize and log for debugging
      console.log("Final report data:", newReportData);
      setReportData(newReportData);
      setReportGenerated(true);
      
      // Refresh recent reports after generation
      fetchRecentReports();

    } catch (error) {
      console.error("Generation Error:", error);
      alert("Failed to generate report: " + (error.response?.data?.error || error.message || "Please check your connection."));
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: CLEAN TEXT ---
  const cleanText = (text) => {
    if (!text || typeof text !== 'string') return '';
    // Decode HTML entities first
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    let cleaned = tempDiv.textContent || tempDiv.innerText || text;
    // Remove HTML tags if any
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    // Remove control characters (excluding common whitespace)
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Remove zero-width characters
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
    // Normalize quotes
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
    return cleaned;
  };

  const truncateCaption = (caption, maxLength = 60) => {
    if (!caption) return 'No caption';
    const cleaned = cleanText(caption);
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  };

  // --- HELPER: FORMAT DATES ---
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // --- HELPER: DOWNLOAD PDF ---
  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      let yPos = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (yPos + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };
      
      // Cover Page
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('DIGI CAROTENE', margin, 60, { align: 'left' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('GROWTH & ANALYTICS', margin, 75);
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const accountName = reportData.account?.account_name || 'Social Media Report';
      doc.text(accountName, margin, 100);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Performance Report', margin, 115);
      
      doc.setFontSize(12);
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, margin, 135);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 145);
      
      // Add new page for content
      doc.addPage();
      yPos = margin;
      
      // Key Metrics Section
      doc.setFillColor(245, 247, 250);
      doc.rect(margin - 5, yPos - 5, pageWidth - (margin * 2) + 10, 40, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Metrics', margin, yPos + 10);
      
      yPos += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const stats = reportData.organicStats || {};
      const metrics = [
        ['CURRENT FOLLOWERS', (stats.followers || 0).toLocaleString()],
        ['TOTAL REACH', (stats.reach || 0).toLocaleString()],
        ['ENGAGEMENT', (stats.engagement || 0).toLocaleString()],
        ['POSTS', (stats.posts_count || 0).toLocaleString()]
      ];
      
      const colWidth = (pageWidth - (margin * 2)) / 4;
      metrics.forEach(([label, value], index) => {
        const x = margin + (index * colWidth);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(label, x, yPos);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(value, x, yPos + 8);
      });
      
      yPos += 25;
      checkPageBreak(50);
      
      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const execSummary = summaryText || "Engagement remains strong this period. We observed consistent growth in reach and positive audience sentiment across key content pillars.";
      const summaryLines = doc.splitTextToSize(execSummary, pageWidth - (margin * 2));
      doc.text(summaryLines, margin, yPos);
      yPos += (summaryLines.length * 5) + 10;
      checkPageBreak(50);
      
      // Organic Performance Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Organic Performance', margin, yPos);
      yPos += 8;
      
      const organicData = [
        ['CURRENT FOLLOWERS', (stats.followers || 0).toLocaleString()],
        ['IMPRESSIONS', (stats.impressions || 0).toLocaleString()],
        ['TOTAL REACH', (stats.reach || 0).toLocaleString()],
        ['ENGAGEMENT', (stats.engagement || 0).toLocaleString()],
        ['PROFILE VIEWS', (stats.profile_views || 0).toLocaleString()],
        ['ENGAGEMENT RATE', stats.followers > 0 ? ((stats.engagement / stats.followers) * 100).toFixed(2) + '%' : '0%'],
        ['LIKES', (stats.likes || 0).toLocaleString()],
        ['COMMENTS', (stats.comments || 0).toLocaleString()]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: organicData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: margin, right: margin },
        showHead: 'everyPage'
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      checkPageBreak(50);
      
      // Top Posts Section
      if (reportData.posts && reportData.posts.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Performing Posts', margin, yPos);
        yPos += 8;
        
        // Prepare posts data with better caption handling and thumbnails
        const topPostsData = await Promise.all(reportData.posts.slice(0, 10).map(async (post, index) => {
          // Format caption - show full caption, will wrap in table cell
          const caption = post.caption || 'No caption';
          // Clean text: remove newlines, extra spaces, and fix encoding
          const cleanCaption = cleanText(caption);
          
          // Format permalink for view link - keep full URL for clickable link
          const viewLink = post.permalink || post.media_url || '';
          
          return [
            (index + 1).toString(),
            'Banner', // Banner placeholder
            new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            cleanCaption, // Full caption - will wrap in cell
            (post.likes || 0).toLocaleString(),
            (post.comments || 0).toLocaleString(),
            (post.engagement || 0).toLocaleString(),
            ((post.engagement_rate || 0).toFixed(2)) + '%',
            viewLink || 'N/A' // Full link for clickability
          ];
        }));
        
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Banner', 'Date', 'Caption', 'Likes', 'Comments', 'Engagement', 'ER%', 'View Link']],
          body: topPostsData,
          theme: 'grid',
          headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 7, cellPadding: 2 },
          showHead: 'everyPage',
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // #
            1: { cellWidth: 15, halign: 'center' }, // Banner
            2: { cellWidth: 20, halign: 'center' }, // Date
            3: { cellWidth: 50, cellMinHeight: 15 }, // Caption - Increased width, allow wrapping
            4: { cellWidth: 15, halign: 'right' }, // Likes
            5: { cellWidth: 15, halign: 'right' }, // Comments
            6: { cellWidth: 18, halign: 'right' }, // Engagement
            7: { cellWidth: 15, halign: 'right' }, // ER%
            8: { cellWidth: 35, fontSize: 6, fontStyle: 'italic' } // View link column
          },
          margin: { left: margin, right: margin },
          didDrawCell: async (data) => {
            const post = reportData.posts[data.row.index];
            
            // Add thumbnail images in Banner column (index 1)
            if (data.section === 'body' && data.column.index === 1) {
              if (post && (post.thumbnail_url || post.media_url)) {
                try {
                  const imgUrl = post.thumbnail_url || post.media_url;
                  if (imgUrl) {
                    // Try to load and add actual image
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = reject;
                      img.src = imgUrl;
                      // Timeout after 3 seconds
                      setTimeout(() => reject(new Error('Image load timeout')), 3000);
                    });
                    
                    const imgSize = 12;
                    const x = data.cell.x + (data.cell.width - imgSize) / 2;
                    const y = data.cell.y + 1;
                    
                    // Add image to PDF
                    doc.addImage(img, 'JPEG', x, y, imgSize, imgSize, undefined, 'FAST');
                  }
                } catch (e) {
                  // Fallback to placeholder if image fails to load
                  const imgSize = 12;
                  const x = data.cell.x + (data.cell.width - imgSize) / 2;
                  const y = data.cell.y + 1;
                  
                  doc.setFillColor(240, 240, 240);
                  doc.rect(x, y, imgSize, imgSize, 'F');
                  doc.setDrawColor(200, 200, 200);
                  doc.rect(x, y, imgSize, imgSize, 'S');
                  
                  doc.setFontSize(6);
                  doc.setTextColor(150, 150, 150);
                  const icon = post.media_type === 'VIDEO' ? '▶' : post.media_type === 'CAROUSEL_ALBUM' ? '⋮' : '📷';
                  doc.text(icon, x + imgSize / 2, y + imgSize / 2 + 1, { align: 'center' });
                }
              }
            }
            
            // Make View Link column clickable (index 8)
            if (data.section === 'body' && data.column.index === 8 && post) {
              const viewLink = post.permalink || post.media_url || '';
              if (viewLink && viewLink !== 'N/A' && viewLink.startsWith('http')) {
                // Add clickable link
                const linkX = data.cell.x + 1;
                const linkY = data.cell.y + data.cell.height - 1;
                doc.setTextColor(0, 0, 255);
                doc.setFontSize(6);
                doc.textWithLink('View Post', linkX, linkY, { url: viewLink });
              }
            }
          },
          didParseCell: (hookData) => {
            // Clear Banner column text (index 1) - we'll draw image instead
            if (hookData.column.index === 1) {
              hookData.cell.text = [''];
            }
            // Clear View Link column text (index 8) - we'll draw clickable link instead
            if (hookData.column.index === 8) {
              hookData.cell.text = [''];
            }
          }
        });
      }
      
      const filename = `Report_${accountName.replace(/[^a-z0-9]/gi, '_')}_${startDate}_${endDate}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback to html2canvas method
      try {
        const element = document.getElementById('report-content');
        if (!element) {
          throw new Error('Report content element not found');
        }
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const accountName = reportData.account?.account_name || 'Report';
        pdf.save(`Report_${accountName.replace(/[^a-z0-9]/gi, '_')}_${startDate}_${endDate}.pdf`);
      } catch (fallbackError) {
        console.error('Fallback PDF generation error:', fallbackError);
        alert('Failed to generate PDF. Please try printing instead (Ctrl+P or use Print button).');
      }
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // --- PREPARE CHART DATA ---
  const engagementChartData = [
    { name: 'Likes', value: reportData.engagementBreakdown.likes },
    { name: 'Comments', value: reportData.engagementBreakdown.comments },
    { name: 'Shares', value: reportData.engagementBreakdown.shares },
    { name: 'Saves', value: reportData.engagementBreakdown.saves }
  ].filter(item => item.value > 0);

  const topPostsData = reportData.posts.slice(0, 5).map(post => ({
    name: post.caption ? post.caption.substring(0, 20) + '...' : 'Post',
    engagement: parseInt(post.engagement) || 0,
    reach: parseInt(post.reach) || 0
  }));

  // ==================================================================================
  // VIEW 1: CONFIGURATION
  // ==================================================================================
  if (!reportGenerated) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e', mb: 1 }}>
            Unified Report Builder
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate a comprehensive report with Organic, Paid, and Content metrics in one PDF.
          </Typography>
        </Box>

        {/* Recent Reports Section */}
        {recentReports.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment /> Recent Reports
            </Typography>
            <Grid container spacing={2}>
              {recentReports.map((report) => (
                <Grid item xs={12} md={4} key={report.id}>
                  <Card sx={{ border: '1px solid #e0e0e0', '&:hover': { boxShadow: 4 } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {report.type === 'content_performance' ? 'Content Performance' : 'Organic Report'}
                          </Typography>
                          <Chip 
                            label={report.platform?.toUpperCase() || 'INSTAGRAM'} 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 0.5, fontSize: '0.7rem' }}
                          />
                        </Box>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={async () => {
                            if (window.confirm('Delete this report?')) {
                              try {
                                await axios.delete(`${API_BASE_URL}/api/reports.php?id=${report.id}`);
                                fetchRecentReports();
                                alert('Report deleted');
                              } catch (error) {
                                alert('Failed to delete report');
                              }
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {report.start_date} to {report.end_date}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Generated: {new Date(report.created_at).toLocaleString()}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            // Load report data
                            if (report.type === 'content_performance') {
                              const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
                              if (reportData.posts) {
                                setReportData(prev => ({
                                  ...prev,
                                  posts: reportData.posts || [],
                                  postsData: reportData,
                                  account: { account_name: reportData.account_name, platform: report.platform }
                                }));
                                setStartDate(report.start_date);
                                setEndDate(report.end_date);
                                setReportGenerated(true);
                              }
                            }
                          }}
                          sx={{ flex: 1, minWidth: 120 }}
                        >
                          VIEW REPORT
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdf />}
                          onClick={() => {
                            // Trigger PDF download for this report
                            window.print();
                          }}
                          sx={{ flex: 1, minWidth: 120 }}
                        >
                          View to Download PDF
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Report Configuration
          </Typography>
          
          {accounts.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Account</InputLabel>
                  <Select
                    value={selectedAccountId}
                    label="Select Account"
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>-- Choose Account --</em>
                    </MenuItem>
                    {accounts.map((acc) => (
                      <MenuItem key={acc.id} value={acc.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {acc.platform?.toLowerCase() === 'instagram' ? <Instagram color="error" /> : <Facebook color="primary" />}
                          {acc.account_name} ({acc.platform})
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Period Type</InputLabel>
                  <Select
                    value={periodType}
                    label="Period Type"
                    onChange={(e) => setPeriodType(e.target.value)}
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showComparison}
                      onChange={(e) => setShowComparison(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Period Comparison (Shows growth vs previous period)"
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  onClick={handleGenerateReport}
                  disabled={loading || !selectedAccountId}
                  sx={{ 
                    height: 56, 
                    fontSize: '1rem', 
                    background: 'linear-gradient(to right, #667eea, #764ba2)',
                    '&:hover': {
                      background: 'linear-gradient(to right, #764ba2, #667eea)'
                    }
                  }}
                >
                  {loading ? <CircularProgress color="inherit" size={24} /> : 'Generate'}
                </Button>
              </Grid>
              
              {loading && (
                <Grid item xs={12}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Fetching data from APIs... This may take a moment.
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={12} sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  size="small" 
                  onClick={() => setAccountManagerOpen(true)}
                  startIcon={<Settings />}
                >
                  Manage / Add More Accounts
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No accounts connected yet.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setAccountManagerOpen(true)}
                sx={{ mt: 2 }}
              >
                Connect Account
              </Button>
            </Box>
          )}
        </Paper>

        <UnifiedAccountManager 
          open={accountManagerOpen} 
          onClose={() => {
            setAccountManagerOpen(false);
            fetchAccounts();
          }} 
        />
      </Container>
    );
  }

  // ==================================================================================
  // VIEW 2: THE COMPREHENSIVE REPORT
  // ==================================================================================
  return (
    <Box id="report-content">
      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: 4, mb: 4,
          '@media print': { 
            maxWidth: '100% !important', 
            padding: '20px !important', 
            margin: '0 !important' 
          }
        }}
      >
        {/* --- SCREEN HEADER (Navigation) --- */}
        <Box className="no-print" sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setReportGenerated(false)} variant="outlined">
            Back to Config
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={isDownloadingPDF ? <CircularProgress size={20} /> : <PictureAsPdf />} 
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              sx={{ background: 'linear-gradient(to right, #667eea, #764ba2)' }}
            >
              {isDownloadingPDF ? 'Generating PDF...' : 'Download PDF'}
            </Button>
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()} size="large">
              Print
            </Button>
          </Box>
        </Box>

        {/* --- COVER PAGE / HEADER --- */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '@media print': {
              background: '#667eea !important',
              pageBreakAfter: 'always'
            }
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: '800', mb: 1, letterSpacing: '-1px' }}>
            DIGI CAROTENE
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, letterSpacing: '2px' }}>
            GROWTH & ANALYTICS
          </Typography>
          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 3 }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            {reportData.account?.account_name || 'Social Media Report'}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Performance Report
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>CURRENT FOLLOWERS</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {(reportData.organicStats?.followers || 0).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>TOTAL REACH</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {(reportData.organicStats?.reach || 0).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>ENGAGEMENT</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {(reportData.organicStats?.engagement || 0).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>POSTS</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {reportData.contentMetrics.totalPosts || reportData.organicStats?.posts_count || 0}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* --- EXECUTIVE SUMMARY --- */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, mb: 4, bgcolor: '#e3f2fd', border: '2px solid #90caf9',
            '@media print': { bgcolor: '#f8f9fa !important', border: '2px solid #1a237e !important', pageBreakInside: 'avoid' }
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: '#1565c0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment /> EXECUTIVE SUMMARY
          </Typography>
          <TextField
            multiline 
            fullWidth 
            variant="standard"
            value={summaryText} 
            onChange={(e) => setSummaryText(e.target.value)}
            InputProps={{ disableUnderline: true }}
            sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem', lineHeight: 1.6, color: '#333' } }}
            className="no-print"
          />
          <Typography 
            variant="body1" 
            sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#333', mt: 1 }}
            className="print-only"
          >
            {summaryText}
          </Typography>
        </Paper>

        {/* --- 1. ORGANIC PERFORMANCE METRICS --- */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, borderLeft: '6px solid #f50057', pageBreakInside: 'avoid' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Organic Performance</Typography>
            <Chip 
              icon={reportData.account?.platform?.toLowerCase() === 'instagram' ? <Instagram /> : <Facebook />} 
              label={reportData.account?.account_name || 'Account'} 
              color="primary"
              variant="outlined"
            />
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    CURRENT FOLLOWERS
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
                    {(reportData.organicStats?.followers || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    IMPRESSIONS
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main" sx={{ mt: 1 }}>
                    {(reportData.organicStats?.impressions || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    TOTAL REACH
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 1 }}>
                    {(reportData.organicStats?.reach || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    ENGAGEMENT
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mt: 1 }}>
                    {(reportData.organicStats?.engagement || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
            
          {/* Additional Metrics Row */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      PROFILE VIEWS
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="secondary.main" sx={{ mt: 1 }}>
                      {(reportData.organicStats?.profile_views || 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      ENGAGEMENT RATE
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ mt: 1 }}>
                      {reportData.organicStats?.followers > 0 
                        ? ((reportData.organicStats.engagement / reportData.organicStats.followers) * 100).toFixed(2)
                        : reportData.contentMetrics.avgEngagementRate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      LIKES
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="error.main" sx={{ mt: 1 }}>
                      {(reportData.engagementBreakdown.likes || 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#f8f9fa', height: '100%' }}>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      COMMENTS
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main" sx={{ mt: 1 }}>
                      {(reportData.engagementBreakdown.comments || 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* --- ENGAGEMENT BREAKDOWN CHARTS --- */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 350, border: '1px solid #e0e0e0', pageBreakInside: 'avoid' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Engagement Breakdown
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Compare your key engagement metrics at a glance
                </Typography>
                <Box sx={{ width: '100%', height: 280, minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Likes', value: reportData.engagementBreakdown.likes || 0 },
                      { name: 'Comments', value: reportData.engagementBreakdown.comments || 0 },
                      { name: 'Shares', value: reportData.engagementBreakdown.shares || 0 },
                      { name: 'Saves', value: reportData.engagementBreakdown.saves || 0 }
                    ].filter(item => item.value > 0)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#667eea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 350, border: '1px solid #e0e0e0', pageBreakInside: 'avoid' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Engagement Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Likes vs Comments breakdown
                </Typography>
                <Box sx={{ width: '100%', height: 280, minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Likes', value: reportData.engagementBreakdown.likes || 0 },
                          { name: 'Comments', value: reportData.engagementBreakdown.comments || 0 }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {[
                        { name: 'Likes', value: reportData.engagementBreakdown.likes || 0 },
                        { name: 'Comments', value: reportData.engagementBreakdown.comments || 0 }
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* --- CONTENT PERFORMANCE DETAILED TABLE (Matching Image Design) --- */}
          <Paper elevation={2} sx={{ p: 3, mb: 4, pageBreakInside: 'avoid' }}>
            {/* Header matching image */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {reportData.postsData?.account_name || reportData.account?.account_name || 'Content Performance'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Posts: {reportData.contentMetrics.totalPosts || reportData.posts.length} | Total Stories: {reportData.contentMetrics.totalStories || 0} | Platform: {reportData.postsData?.platform?.toUpperCase() || reportData.account?.platform?.toUpperCase() || 'INSTAGRAM'}
              </Typography>
              {reportData.postsData?.date_range && (
                <Typography variant="body2" color="primary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DateRange fontSize="small" /> Period: {formatDate(reportData.postsData.date_range.start)} - {formatDate(reportData.postsData.date_range.end)}
                </Typography>
              )}
            </Box>
            
            {reportData.posts.length > 0 ? (
              <TableContainer>
                <Table sx={{ '@media print': { fontSize: '0.7rem' } }}>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Banner</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <Favorite sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Likes
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <ChatBubble sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Comments
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <TrendingUp sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Engagement
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Eng. Rate</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <Visibility sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Views
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <Bookmark sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Saved
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        <Share sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Shares
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.posts.map((post, index) => {
                      // Calculate engagement rate
                      const engagementRate = post.engagement_rate || 
                        (reportData.organicStats?.followers > 0 
                          ? ((parseInt(post.engagement) || 0) / reportData.organicStats.followers * 100).toFixed(2)
                          : '0.00');
                      
                      const likes = parseInt(post.likes) || 0;
                      const comments = parseInt(post.comments) || 0;
                      const engagement = parseInt(post.engagement) || 0;
                      const views = parseInt(post.views) || parseInt(post.reach) || 0;
                      const saved = parseInt(post.saved) || 0;
                      const shares = parseInt(post.shares) || 0;
                      
                      return (
                        <TableRow key={post.id || index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                bgcolor: '#f5f5f5',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e0e0e0'
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 500, color: '#666' }}>
                                {post.thumbnail_url || post.media_url ? (
                                  <Box
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      borderRadius: 1,
                                      overflow: 'hidden',
                                      border: '1px solid #e0e0e0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: '#f5f5f5',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(post.permalink || post.media_url, '_blank')}
                                  >
                                    <img
                                      src={post.thumbnail_url || post.media_url}
                                      alt={post.caption ? cleanText(post.caption).substring(0, 30) : 'Post thumbnail'}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) {
                                          e.target.nextSibling.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <Box
                                      sx={{
                                        display: 'none',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%'
                                      }}
                                    >
                                      {post.media_type === 'VIDEO' || post.media_type === 'REELS' ? (
                                        <PlayArrow sx={{ fontSize: 24, color: '#666' }} />
                                      ) : post.media_type === 'CAROUSEL_ALBUM' ? (
                                        <ViewCarousel sx={{ fontSize: 24, color: '#666' }} />
                                      ) : (
                                        <ImageIcon sx={{ fontSize: 24, color: '#666' }} />
                                      )}
                                      <Typography variant="caption" sx={{ fontSize: 8, color: '#666', mt: 0.5 }}>
                                        {post.media_type || 'IMAGE'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Box
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      bgcolor: '#f5f5f5',
                                      borderRadius: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid #e0e0e0'
                                    }}
                                  >
                                    {post.media_type === 'VIDEO' || post.media_type === 'REELS' ? (
                                      <PlayArrow sx={{ fontSize: 24, color: '#666' }} />
                                    ) : post.media_type === 'CAROUSEL_ALBUM' ? (
                                      <ViewCarousel sx={{ fontSize: 24, color: '#666' }} />
                                    ) : (
                                      <ImageIcon sx={{ fontSize: 24, color: '#666' }} />
                                    )}
                                  </Box>
                                )}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <MuiTooltip title={cleanText(post.caption) || 'No caption'}>
                              <Typography variant="body2">
                                {truncateCaption(post.caption, 60)}
                              </Typography>
                            </MuiTooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {likes.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {comments.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={engagement.toLocaleString()}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${engagementRate}%`}
                              color={parseFloat(engagementRate) >= 5 ? 'success' : parseFloat(engagementRate) >= 3 ? 'warning' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                              {views && views > 0 ? views.toLocaleString() : 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {post.media_type === 'VIDEO' || post.media_type === 'REELS' ? 'plays' : 'views'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {saved && saved > 0 ? saved.toLocaleString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {shares && shares > 0 ? shares.toLocaleString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="primary"
                              href={post.permalink}
                              target="_blank"
                              title="View on Instagram"
                            >
                              <OpenInNew />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No posts found in this date range. Try adjusting your date range or check if the account has posted content.
              </Alert>
            )}
          </Paper>

          {/* --- TOP 5 PERFORMING POSTS --- */}
          {reportData.posts.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 4, pageBreakInside: 'avoid' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="primary" /> Top 5 Performing Posts
              </Typography>
              <Grid container spacing={2}>
                {reportData.posts
                  .sort((a, b) => (parseInt(b.engagement) || 0) - (parseInt(a.engagement) || 0))
                  .slice(0, 5)
                  .map((post, index) => {
                    const engagementRate = post.engagement_rate || 
                      (reportData.organicStats?.followers > 0 
                        ? ((parseInt(post.engagement) || 0) / reportData.organicStats.followers * 100).toFixed(2)
                        : '0.00');
                    
                    return (
                      <Grid item xs={12} key={post.id || index}>
                        <Card sx={{ border: '1px solid #e0e0e0', '&:hover': { boxShadow: 4 } }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Box sx={{ position: 'relative' }}>
                                {post.media_url ? (
                                  <Avatar 
                                    src={post.media_url} 
                                    variant="rounded" 
                                    sx={{ width: 100, height: 100 }}
                                  />
                                ) : (
                                  <Avatar variant="rounded" sx={{ width: 100, height: 100, bgcolor: '#e0e0e0' }}>
                                    {post.media_type === 'VIDEO' ? <PlayArrow sx={{ fontSize: 40 }} /> : <ImageIcon sx={{ fontSize: 40 }} />}
                                  </Avatar>
                                )}
                                <Chip 
                                  label={`#${index + 1}`}
                                  size="small"
                                  sx={{ 
                                    position: 'absolute', 
                                    top: -8, 
                                    left: -8, 
                                    bgcolor: '#ffd700', 
                                    fontWeight: 'bold',
                                    color: '#000'
                                  }}
                                />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Chip 
                                    label={post.media_type || 'IMAGE'} 
                                    size="small" 
                                    color={post.media_type === 'VIDEO' ? 'primary' : 'default'}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(post.timestamp)}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ mb: 1.5, maxHeight: 40, overflow: 'hidden' }}>
                                  {post.caption ? (post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption) : 'No caption'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                  <Chip 
                                    icon={<Favorite />} 
                                    label={`${parseInt(post.likes) || 0} Likes`} 
                                    size="small" 
                                    color="error"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    icon={<ChatBubble />} 
                                    label={`${parseInt(post.comments) || 0} Comments`} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    icon={<Visibility />} 
                                    label={`${parseInt(post.views) || parseInt(post.reach) || 0} Views`} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                  <Chip 
                                    label={`${parseInt(post.engagement) || 0} Engagement`} 
                                    size="small" 
                                    color="primary"
                                  />
                                  <Chip 
                                    label={`${engagementRate}% ER`} 
                                    size="small" 
                                    color={parseFloat(engagementRate) >= 5 ? 'success' : 'default'}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
              </Grid>
            </Paper>
          )}

          {/* --- AUDIENCE DEMOGRAPHICS (If Available) --- */}
          {reportData.demographics.age.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 4, pageBreakInside: 'avoid' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <People color="primary" /> Audience Demographics (Paid Ads)
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2, height: 300, border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" align="center" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Age Distribution
                    </Typography>
                    <Box sx={{ width: '100%', height: 255, minHeight: 255 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.demographics.age}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#667eea" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2, height: 300, border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" align="center" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Gender Split
                    </Typography>
                    <Box sx={{ width: '100%', height: 255, minHeight: 255 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.demographics.gender}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          >
                            {reportData.demographics.gender.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* --- KEY INSIGHTS & RECOMMENDATIONS --- */}
          <Paper elevation={2} sx={{ p: 3, mb: 4, pageBreakInside: 'avoid' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Key Insights & Recommendations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#e8f5e9', border: '1px solid #4caf50', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp /> Strengths
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#1b5e20' }}>
                      {reportData.contentMetrics.avgEngagementRate >= 5 
                        ? `Your engagement rate of ${reportData.contentMetrics.avgEngagementRate.toFixed(2)}% meets industry benchmarks, indicating strong content resonance with your audience. Continue creating content that drives this level of interaction.`
                        : `Your account has ${(reportData.organicStats?.followers || 0).toLocaleString()} Current Followers with consistent content posting. Focus on increasing engagement through strategic calls-to-action.`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ff9800', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#e65100', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assessment /> Opportunities
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#bf360c' }}>
                      {reportData.engagementBreakdown.comments < (reportData.engagementBreakdown.likes * 0.05)
                        ? `Comments represent only ${((reportData.engagementBreakdown.comments / (reportData.engagementBreakdown.likes || 1)) * 100).toFixed(1)}% of total engagement. Consider incorporating more conversation starters, questions, and calls-to-action in your captions to encourage meaningful discussions.`
                        : `Your content is performing well. Consider experimenting with different content formats and posting times to maximize reach and engagement.`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

        </Container>
      </Box>
    );
  };

export default PerformanceSummaryReport;