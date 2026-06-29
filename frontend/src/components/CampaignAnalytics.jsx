import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore,
  Campaign,
  TrendingUp,
  AttachMoney,
  Visibility,
  MouseOutlined,
  BarChart,
  Assessment,
  Settings,
  Download,
  PictureAsPdf,
  TableChart as TableChartIcon,
  Compare,
  Save,
  ShowChart,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { reportsAPI } from '../services/api';
import UnifiedAccountManager from './UnifiedAccountManager';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import MetricCard from './MetricCard';

const CampaignAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [savedAdAccounts, setSavedAdAccounts] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [prevStartDate, setPrevStartDate] = useState('');
  const [prevEndDate, setPrevEndDate] = useState('');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [selectedCampaignForComparison, setSelectedCampaignForComparison] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState('spend');
  const [kpiData, setKpiData] = useState(null);
  const [loadingKPI, setLoadingKPI] = useState(false);

  useEffect(() => {
    fetchSavedAdAccounts();
  }, []);

  const fetchSavedAdAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ad_accounts.php`);
      if (response.data.success) {
        setSavedAdAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const handleAdAccountSelect = (accountId) => {
    setSelectedAdAccount(accountId);
    const account = savedAdAccounts.find(acc => acc.id === parseInt(accountId));
    if (account) {
      setAdAccountId(account.ad_account_id);
      setAccessToken(account.access_token);
    }
  };

  const fetchCampaignReport = async () => {
    if (!adAccountId || !accessToken) {
      alert('Please select an ad account or enter credentials');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/campaign_report.php`, {
        adAccountId,
        accessToken,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accountDbId: selectedAdAccount || undefined // Pass DB ID for status tracking
      });

      if (response.data.success) {
        const reportDataToSet = response.data.data;
        setReportData(reportDataToSet);
        
        // Auto-save the report to database
        try {
          const reportToSave = {
            platform: 'campaigns',
            start_date: reportDataToSet.date_range?.start || startDate,
            end_date: reportDataToSet.date_range?.end || endDate,
            data: JSON.stringify(reportDataToSet)
          };

          await reportsAPI.generate(reportToSave);
          console.log('✅ Campaign report auto-saved successfully');
        } catch (saveError) {
          console.error('Error auto-saving report:', saveError);
          // Don't show error to user - report is still displayed
        }
        
        // Fetch KPI data for the chart
        fetchKPIData();
      } else {
        const errorMsg = response.data.error || 'Unknown error';
        console.error('Campaign API Error:', errorMsg);
        alert('Failed to fetch campaign data:\n\n' + errorMsg + '\n\nPlease check:\n- Your access token is valid and not expired\n- The ad account ID is correct\n- You have the required permissions (ads_read, ads_management)');
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      let errorMsg = 'Error fetching campaign data';
      
      if (error.response) {
        // Server responded with error
        errorMsg = error.response.data?.error || error.response.statusText || 'Server error';
      } else if (error.request) {
        // Request made but no response
        errorMsg = 'No response from server. Please check if the backend is running on port 8000.';
      } else {
        // Something else happened
        errorMsg = error.message || 'Network error';
      }
      
      alert(`Error fetching campaign data:\n\n${errorMsg}\n\nPlease check:\n- Backend server is running (${API_BASE_URL})\n- Your access token is valid\n- Network connection is working`);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIData = async () => {
    if (!adAccountId || !accessToken || !startDate || !endDate) {
      console.log('Missing required params for KPI fetch:', { adAccountId, accessToken, startDate, endDate });
      return;
    }

    setLoadingKPI(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/campaign_kpi.php`, {
        adAccountId,
        accessToken,
        startDate,
        endDate,
        kpi: selectedKPI
      });

      console.log('KPI API Response:', response.data);
      
      if (response.data.success && response.data.data) {
        // Ensure data is an array and sort by date
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        dataArray.sort((a, b) => {
          const dateA = new Date(a.date || a.formattedDate);
          const dateB = new Date(b.date || b.formattedDate);
          return dateA - dateB;
        });
        console.log('Setting KPI data:', dataArray);
        setKpiData(dataArray);
      } else {
        console.warn('KPI API returned no data:', response.data);
        setKpiData([]);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setKpiData([]);
    } finally {
      setLoadingKPI(false);
    }
  };

  // Fetch KPI data when KPI selection or dates change
  useEffect(() => {
    if (reportData && adAccountId && accessToken && startDate && endDate) {
      fetchKPIData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKPI, startDate, endDate, reportData]);

  const handleSaveReport = async () => {
    if (!reportData) {
      alert('No report data to save');
      return;
    }

    try {
      const reportToSave = {
        platform: 'campaigns',
        start_date: reportData.date_range?.start || startDate,
        end_date: reportData.date_range?.end || endDate,
        data: JSON.stringify(reportData)
      };

      await reportsAPI.generate(reportToSave);
      alert('✅ Campaign report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const formattedAmount = Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // For INR, show currency code instead of symbol
    if (currency === 'INR') {
      return formattedAmount + ' INR';
    }
    
    // For other currencies, use standard formatting
    const currencySymbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AUD': 'A$',
      'CAD': 'C$',
      'SGD': 'S$',
      'AED': 'AED',
    };
    
    const symbol = currencySymbols[currency] || currency;
    return symbol + formattedAmount;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'ARCHIVED':
        return 'default';
      default:
        return 'error';
    }
  };

  const downloadPDF = async () => {
    if (!reportData) return;

    // Expand all accordions before printing
    const accordions = document.querySelectorAll('.MuiAccordion-root');
    const expandedStates = [];
    
    accordions.forEach((accordion, index) => {
      const isExpanded = accordion.classList.contains('Mui-expanded');
      expandedStates.push(isExpanded);
      
      // Expand if not already expanded
      if (!isExpanded) {
        const button = accordion.querySelector('.MuiAccordionSummary-root');
        if (button) button.click();
      }
    });

    // Wait for accordions to expand
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use browser print
    window.print();

    // Restore accordion states after a delay
    setTimeout(() => {
      accordions.forEach((accordion, index) => {
        const wasExpanded = expandedStates[index];
        const isExpanded = accordion.classList.contains('Mui-expanded');
        
        // Collapse if it wasn't originally expanded
        if (!wasExpanded && isExpanded) {
          const button = accordion.querySelector('.MuiAccordionSummary-root');
          if (button) button.click();
        }
      });
    }, 2000);
  };

  const downloadPDF_OLD = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const currency = reportData.account_currency || reportData.summary.currency;
    
    // Add Poppins font (using Helvetica as fallback since jsPDF doesn't have Poppins by default)
    // We'll use the built-in fonts but with better styling
    
    // Helper function to draw a metric card with better sizing
    const drawMetricCard = (x, y, width, height, value, label, color) => {
      // Card background with shadow effect
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(x + 0.5, y + 0.5, width, height, 3, 3, 'F');
      
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, width, height, 3, 3, 'FD');
      
      // Color accent bar at top
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y, width, 2, 3, 3, 'F');
      
      // Value
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      const cleanValue = String(value).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079]\s*/, ''); // Remove superscript numbers
      doc.text(cleanValue, x + width / 2, y + height / 2 - 1, { align: 'center' });
      
      // Label
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + width / 2, y + height / 2 + 5, { align: 'center' });
    };
    
    // Helper function to draw section header
    const drawSectionHeader = (text, y, color) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(14, y, 182, 10, 2, 2, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 16, y + 6.5);
      doc.setFont('helvetica', 'normal');
    };
    
    // Helper function for paragraphs with 1.5 line spacing
    const drawParagraph = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.5; // 1.5 line spacing
      lines.forEach((line, index) => {
        doc.text(line, x, y + (index * lineHeight));
      });
      return y + (lines.length * lineHeight);
    };
    
    // Title Page
    doc.setFontSize(26);
    doc.setTextColor(102, 126, 234);
    doc.setFont('helvetica', 'bold');
    doc.text('Campaign Performance Report', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Period: ' + reportData.date_range.start + ' to ' + reportData.date_range.end, doc.internal.pageSize.getWidth() / 2, 42, { align: 'center' });
    doc.text('Ad Account: ' + adAccountId, doc.internal.pageSize.getWidth() / 2, 49, { align: 'center' });
    doc.text('Currency: ' + currency, doc.internal.pageSize.getWidth() / 2, 56, { align: 'center' });
    
    // Executive Summary Paragraph
    doc.setFontSize(15);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 14, 70);
    
    const summaryText = 'This report provides a comprehensive overview of your advertising campaigns during the specified period. ' +
      'A total of ' + reportData.summary.total_campaigns + ' campaigns were analyzed, with ' + reportData.summary.active_campaigns + ' currently active. ' +
      'The total advertising spend was ' + formatCurrency(reportData.summary.total_spend, currency).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079]\s*/, '') + ', generating ' +
      reportData.summary.total_impressions.toLocaleString() + ' impressions and ' + reportData.summary.total_clicks.toLocaleString() + ' clicks. ' +
      'The average click-through rate across all campaigns was ' + reportData.summary.avg_ctr + '%, indicating ' +
      (reportData.summary.avg_ctr >= 2 ? 'strong' : 'moderate') + ' audience engagement with your advertising content.';
    
    const summaryEndY = drawParagraph(summaryText, 14, 78, 180, 10);
    
    // Account Summary Cards with better sizing
    drawSectionHeader('Key Performance Metrics', summaryEndY + 10, [102, 126, 234]);
    
    let cardY = summaryEndY + 24;
    const cardWidth = 44;
    const cardHeight = 26;
    const cardSpacing = 3;
    
    // Row 1: 4 cards
    drawMetricCard(14, cardY, cardWidth, cardHeight, 
      formatCurrency(reportData.summary.total_spend, currency), 'Total Spend', [102, 126, 234]);
    drawMetricCard(14 + cardWidth + cardSpacing, cardY, cardWidth, cardHeight,
      reportData.summary.total_impressions.toLocaleString(), 'Impressions', [228, 64, 95]);
    drawMetricCard(14 + (cardWidth + cardSpacing) * 2, cardY, cardWidth, cardHeight,
      reportData.summary.total_clicks.toLocaleString(), 'Clicks', [16, 185, 129]);
    drawMetricCard(14 + (cardWidth + cardSpacing) * 3, cardY, cardWidth, cardHeight,
      reportData.summary.active_campaigns + '/' + reportData.summary.total_campaigns, 'Campaigns', [245, 158, 11]);
    
    cardY += cardHeight + cardSpacing + 1;
    
    // Row 2: 4 cards
    drawMetricCard(14, cardY, cardWidth, cardHeight,
      (reportData.summary.total_reach || 0).toLocaleString(), 'Reach', [139, 92, 246]);
    drawMetricCard(14 + cardWidth + cardSpacing, cardY, cardWidth, cardHeight,
      reportData.summary.avg_ctr + '%', 'Avg CTR', [24, 119, 242]);
    drawMetricCard(14 + (cardWidth + cardSpacing) * 2, cardY, cardWidth, cardHeight,
      formatCurrency(reportData.summary.avg_cpc, currency), 'Avg CPC', [236, 72, 153]);
    drawMetricCard(14 + (cardWidth + cardSpacing) * 3, cardY, cardWidth, cardHeight,
      formatCurrency(reportData.summary.avg_cpm, currency), 'Avg CPM', [251, 146, 60]);
    
    // Campaigns with Ad Sets and Ads
    reportData.campaigns.forEach((campaign, campaignIndex) => {
      doc.addPage();
      
      // Campaign Header with status badge
      doc.setFontSize(17);
      doc.setTextColor(102, 126, 234);
      doc.setFont('helvetica', 'bold');
      doc.text('Campaign ' + (campaignIndex + 1), 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(campaign.name, 14, 30);
      
      // Status badge
      const statusColor = campaign.status === 'ACTIVE' ? [16, 185, 129] : 
                         campaign.status === 'PAUSED' ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(14, 34, 22, 7, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(campaign.status, 25, 38.5, { align: 'center' });
      
      // Spend badge
      doc.setFontSize(11);
      doc.setTextColor(102, 126, 234);
      doc.setFont('helvetica', 'bold');
      const cleanSpend = formatCurrency(campaign.metrics.spend, currency).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079]\s*/, '');
      doc.text(cleanSpend, 40, 38.5);
      
      // Campaign Description with 1.5 line spacing
      const campaignDesc = 'This ' + campaign.objective.toLowerCase() + ' campaign achieved ' + 
        campaign.metrics.impressions.toLocaleString() + ' impressions, reaching ' + 
        campaign.metrics.reach.toLocaleString() + ' unique users. Generated ' + campaign.metrics.clicks.toLocaleString() + 
        ' clicks with a CTR of ' + campaign.metrics.ctr + '%. Cost per click: ' + 
        formatCurrency(campaign.metrics.cpc, currency).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079]\s*/, '') + ', CPM: ' + 
        formatCurrency(campaign.metrics.cpm, currency).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079]\s*/, '') + '.';
      
      const descEndY = drawParagraph(campaignDesc, 14, 46, 180, 10);
      
      // Campaign Metrics Cards
      drawSectionHeader('Campaign Performance', descEndY + 5, [102, 126, 234]);
      
      let metricsY = descEndY + 17;
      const metricCardWidth = 30;
      const metricCardHeight = 18;
      const metricSpacing = 2.5;
      
      // Row 1: 6 cards - evenly spaced
      drawMetricCard(14, metricsY, metricCardWidth, metricCardHeight,
        campaign.metrics.impressions.toLocaleString(), 'Impressions', [102, 126, 234]);
      drawMetricCard(14 + (metricCardWidth + metricSpacing), metricsY, metricCardWidth, metricCardHeight,
        campaign.metrics.reach.toLocaleString(), 'Reach', [228, 64, 95]);
      drawMetricCard(14 + (metricCardWidth + metricSpacing) * 2, metricsY, metricCardWidth, metricCardHeight,
        campaign.metrics.clicks.toLocaleString(), 'Clicks', [16, 185, 129]);
      drawMetricCard(14 + (metricCardWidth + metricSpacing) * 3, metricsY, metricCardWidth, metricCardHeight,
        campaign.metrics.ctr + '%', 'CTR', [24, 119, 242]);
      drawMetricCard(14 + (metricCardWidth + metricSpacing) * 4, metricsY, metricCardWidth, metricCardHeight,
        String(formatCurrency(campaign.metrics.cpc, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'CPC', [139, 92, 246]);
      drawMetricCard(14 + (metricCardWidth + metricSpacing) * 5, metricsY, metricCardWidth, metricCardHeight,
        String(formatCurrency(campaign.metrics.cpm, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'CPM', [245, 158, 11]);
      
      let currentY = metricsY + metricCardHeight + 10;
      
      // Ad Sets
      campaign.ad_sets.forEach((adSet, adSetIndex) => {
        if (currentY > 220) {
          doc.addPage();
          currentY = 20;
        }
        
        // Ad Set Header
        drawSectionHeader('Ad Set ' + (adSetIndex + 1) + ': ' + adSet.name, currentY, [118, 75, 162]);
        currentY += 12;
        
        // Ad Set Description with proper line spacing
        const adSetDesc = 'Optimized for ' + adSet.optimization_goal.toLowerCase() + 
          '. Spend: ' + String(formatCurrency(adSet.metrics.spend, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, '') + 
          '. Impressions: ' + adSet.metrics.impressions.toLocaleString() + 
          ', Reach: ' + (adSet.metrics.reach || 0).toLocaleString() + 
          ', Clicks: ' + adSet.metrics.clicks.toLocaleString() + 
          ', CTR: ' + adSet.metrics.ctr + '%, Frequency: ' + adSet.metrics.frequency + '.';
        
        currentY = drawParagraph(adSetDesc, 14, currentY, 180, 9) + 5;
        
        // Ad Set Metrics Cards (7 cards in 2 rows) - ALIGNED
        const adSetCardWidth = 26;
        const adSetCardHeight = 16;
        const adSetSpacing = 2.5;
        
        // Row 1: 4 cards
        drawMetricCard(14, currentY, adSetCardWidth, adSetCardHeight,
          adSet.metrics.impressions.toLocaleString(), 'Impressions', [102, 126, 234]);
        drawMetricCard(14 + (adSetCardWidth + adSetSpacing), currentY, adSetCardWidth, adSetCardHeight,
          (adSet.metrics.reach || 0).toLocaleString(), 'Reach', [228, 64, 95]);
        drawMetricCard(14 + (adSetCardWidth + adSetSpacing) * 2, currentY, adSetCardWidth, adSetCardHeight,
          adSet.metrics.clicks.toLocaleString(), 'Clicks', [16, 185, 129]);
        drawMetricCard(14 + (adSetCardWidth + adSetSpacing) * 3, currentY, adSetCardWidth, adSetCardHeight,
          adSet.metrics.ctr + '%', 'CTR', [24, 119, 242]);
        
        currentY += adSetCardHeight + adSetSpacing;
        
        // Row 2: 3 cards - ALIGNED with row 1 (start at x=14)
        drawMetricCard(14, currentY, adSetCardWidth, adSetCardHeight,
          String(formatCurrency(adSet.metrics.cpc, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'CPC', [139, 92, 246]);
        drawMetricCard(14 + (adSetCardWidth + adSetSpacing), currentY, adSetCardWidth, adSetCardHeight,
          String(formatCurrency(adSet.metrics.cpm, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'CPM', [245, 158, 11]);
        drawMetricCard(14 + (adSetCardWidth + adSetSpacing) * 2, currentY, adSetCardWidth, adSetCardHeight,
          adSet.metrics.frequency + '', 'Frequency', [236, 72, 153]);
        
        currentY += adSetCardHeight + 8;
        
        // Individual Ads Cards
        if (adSet.ads && adSet.ads.length > 0) {
          if (currentY > 210) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.setFont(undefined, 'bold');
          doc.text('Individual Ads (' + adSet.ads.length + ')', 14, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 6;
          
          adSet.ads.forEach((ad, adIndex) => {
            if (currentY > 240) {
              doc.addPage();
              currentY = 20;
            }
            
            // Ad card container
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(250, 250, 250);
            doc.setLineWidth(0.3);
            doc.roundedRect(14, currentY, 182, 24, 2, 2, 'FD');
            
            // Ad name and status
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'bold');
            const adName = ad.name.length > 45 ? ad.name.substring(0, 42) + '...' : ad.name;
            doc.text(adName, 16, currentY + 5);
            
            // Status badge
            const adStatusColor = ad.status === 'ACTIVE' ? [16, 185, 129] : 
                                 ad.status === 'PAUSED' ? [245, 158, 11] : [239, 68, 68];
            doc.setFillColor(adStatusColor[0], adStatusColor[1], adStatusColor[2]);
            doc.roundedRect(160, currentY + 2, 18, 5, 1, 1, 'F');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text(ad.status, 169, currentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            
            // Ad metrics cards (5 cards in row)
            const adCardY = currentY + 9;
            const adCardWidth = 35;
            const adCardHeight = 13;
            const adCardSpacing = 1.5;
            
            drawMetricCard(16, adCardY, adCardWidth, adCardHeight,
              String(formatCurrency(ad.metrics.spend, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'Spend', [102, 126, 234]);
            drawMetricCard(16 + (adCardWidth + adCardSpacing), adCardY, adCardWidth, adCardHeight,
              ad.metrics.impressions.toLocaleString(), 'Impressions', [228, 64, 95]);
            drawMetricCard(16 + (adCardWidth + adCardSpacing) * 2, adCardY, adCardWidth, adCardHeight,
              ad.metrics.clicks.toLocaleString(), 'Clicks', [16, 185, 129]);
            drawMetricCard(16 + (adCardWidth + adCardSpacing) * 3, adCardY, adCardWidth, adCardHeight,
              ad.metrics.ctr + '%', 'CTR', [24, 119, 242]);
            drawMetricCard(16 + (adCardWidth + adCardSpacing) * 4, adCardY, adCardWidth, adCardHeight,
              String(formatCurrency(ad.metrics.cpc, currency)).replace(/^[\u00B9\u00B2\u00B3\u2074-\u2079\u00B9-\u00BE\u2070-\u209F]\s*/, ''), 'CPC', [139, 92, 246]);
            
            currentY += 27;
          });
          
          currentY += 5;
        }
      });
    });
    
    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.getWidth() / 2, 285, { align: 'center' });
      doc.text('Generated: ' + new Date().toLocaleString(), doc.internal.pageSize.getWidth() / 2, 290, { align: 'center' });
    }
    
    doc.save('campaign-report-' + reportData.date_range.start + '-to-' + reportData.date_range.end + '.pdf');
  };

  const downloadCSV = () => {
    if (!reportData) return;

    const currency = reportData.account_currency || reportData.summary.currency;
    const rows = [];
    
    // Header
    rows.push(['Campaign Analytics Report']);
    rows.push([`Period: ${reportData.date_range.start} to ${reportData.date_range.end}`]);
    rows.push([`Ad Account: ${adAccountId}`]);
    rows.push([]);
    
    // Summary
    rows.push(['Account Summary']);
    rows.push(['Total Spend', formatCurrency(reportData.summary.total_spend, currency)]);
    rows.push(['Total Impressions', reportData.summary.total_impressions]);
    rows.push(['Total Clicks', reportData.summary.total_clicks]);
    rows.push(['Campaigns', `${reportData.summary.active_campaigns} / ${reportData.summary.total_campaigns}`]);
    rows.push([]);
    
    // Campaigns
    rows.push(['Campaign', 'Status', 'Objective', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM']);
    
    reportData.campaigns.forEach((campaign) => {
      rows.push([
        campaign.name,
        campaign.status,
        campaign.objective,
        campaign.metrics.spend,
        campaign.metrics.impressions,
        campaign.metrics.clicks,
        campaign.metrics.ctr + '%',
        campaign.metrics.cpc,
        campaign.metrics.cpm
      ]);
      
      // Ad Sets
      campaign.ad_sets.forEach((adSet) => {
        rows.push([
          `  Ad Set: ${adSet.name}`,
          adSet.status,
          adSet.optimization_goal,
          adSet.metrics.spend,
          adSet.metrics.impressions,
          adSet.metrics.clicks,
          adSet.metrics.ctr + '%',
          adSet.metrics.cpc,
          adSet.metrics.cpm
        ]);
        
        // Ads
        adSet.ads.forEach((ad) => {
          rows.push([
            `    Ad: ${ad.name}`,
            ad.status,
            '',
            ad.metrics.spend,
            ad.metrics.impressions,
            ad.metrics.clicks,
            ad.metrics.ctr + '%',
            ad.metrics.cpc,
            ''
          ]);
        });
      });
    });
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-report-${reportData.date_range.start}-to-${reportData.date_range.end}.csv`;
    a.click();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📊 Campaign Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          View detailed performance data for campaigns, ad sets, and individual ads
        </Typography>


        {savedAdAccounts.length > 0 ? (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Ad Account</InputLabel>
                <Select
                  value={selectedAdAccount}
                  onChange={(e) => handleAdAccountSelect(e.target.value)}
                  label="Select Ad Account"
                >
                  <MenuItem value="">-- Choose Ad Account --</MenuItem>
                  {savedAdAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.client_name} ({account.currency})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
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
              <Button
                fullWidth
                variant="contained"
                onClick={fetchCampaignReport}
                disabled={loading || !selectedAdAccount}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, mt: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No ad accounts connected yet
            </Typography>
            <Button
              variant="contained"
              onClick={() => setManageDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              ADD AD ACCOUNT
            </Button>
          </Box>
        )}
      </Paper>

      {reportData && (
        <Box id="campaign-report-content">
          {/* Account Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Account Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  icon={<Save />} 
                  label="Auto-saved" 
                  color="success" 
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={downloadPDF}
                  size="small"
                  disabled={isDownloadingPDF}
                  className="no-print"
                >
                  {isDownloadingPDF ? 'Preparing Report...' : 'Print / Download PDF'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TableChartIcon />}
                  onClick={downloadCSV}
                  size="small"
                >
                  Download CSV
                </Button>
              </Box>
            </Box>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={formatCurrency(reportData.summary.total_spend, reportData.summary.currency)}
                  label={'Total Spend (' + reportData.summary.currency + ')'}
                  showSparkline={true}
                  color="#667eea"
                  sparklineData={[
                    { value: 1200 }, { value: 1400 }, { value: 1100 }, { value: 1600 },
                    { value: 1500 }, { value: 1800 }, { value: 1900 }, { value: reportData.summary.total_spend }
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={reportData.summary.total_impressions.toLocaleString()}
                  label="Total Impressions"
                  showSparkline={false}
                  color="#E4405F"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={reportData.summary.total_clicks.toLocaleString()}
                  label="Total Clicks"
                  showSparkline={false}
                  color="#10b981"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={(reportData.summary.total_leads || 0).toLocaleString()}
                  label="Total Leads"
                  showSparkline={false}
                  color="#8b5cf6"
                />
              </Grid>
            </Grid>

            {/* Second Row of Summary Metrics */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={reportData.summary.active_campaigns + ' / ' + reportData.summary.total_campaigns}
                  label="Active Campaigns"
                  showProgress={false}
                  color="#f59e0b"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={reportData.summary.avg_ctr + '%'}
                  label="Avg CTR"
                  showSparkline={false}
                  color="#06b6d4"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  value={formatCurrency(reportData.summary.avg_cpc, reportData.summary.currency)}
                  label="Avg CPC"
                  showSparkline={false}
                  color="#ec4899"
                />
              </Grid>
              {reportData.summary.total_leads > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <MetricCard
                    value={formatCurrency(reportData.summary.avg_cost_per_lead, reportData.summary.currency)}
                    label="Avg Cost Per Lead"
                    showSparkline={false}
                    color="#a855f7"
                  />
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* KPI Showcase Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                📈 KPI Showcase
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select KPI</InputLabel>
                <Select
                  value={selectedKPI}
                  onChange={(e) => setSelectedKPI(e.target.value)}
                  label="Select KPI"
                >
                  <MenuItem value="spend">Spend</MenuItem>
                  <MenuItem value="impressions">Impressions</MenuItem>
                  <MenuItem value="reach">Reach</MenuItem>
                  <MenuItem value="clicks">Clicks</MenuItem>
                  <MenuItem value="leads">Leads</MenuItem>
                  <MenuItem value="ctr">CTR (%)</MenuItem>
                  <MenuItem value="cpc">CPC</MenuItem>
                  <MenuItem value="cpm">CPM</MenuItem>
                  <MenuItem value="cost_per_lead">Cost Per Lead</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loadingKPI ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : kpiData && Array.isArray(kpiData) && kpiData.length > 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedKPI.charAt(0).toUpperCase() + selectedKPI.slice(1).replace('_', ' ')} over time ({startDate} to {endDate})
                </Typography>
                {process.env.NODE_ENV === 'development' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Debug: {kpiData.length} data points loaded
                  </Typography>
                )}
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={kpiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (selectedKPI === 'spend' || selectedKPI === 'cpc' || selectedKPI === 'cpm' || selectedKPI === 'cost_per_lead') {
                          return formatCurrency(value, reportData.account_currency || 'INR');
                        }
                        if (selectedKPI === 'ctr') {
                          return value.toFixed(2) + '%';
                        }
                        return value.toLocaleString();
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => {
                        if (selectedKPI === 'spend' || selectedKPI === 'cpc' || selectedKPI === 'cpm' || selectedKPI === 'cost_per_lead') {
                          return formatCurrency(value, reportData.account_currency || 'INR');
                        }
                        if (selectedKPI === 'ctr') {
                          return value.toFixed(2) + '%';
                        }
                        return value.toLocaleString();
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#667eea" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={selectedKPI.charAt(0).toUpperCase() + selectedKPI.slice(1).replace('_', ' ')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ShowChart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No data available for the selected KPI and date range
                </Typography>
              </Box>
            )}
          </Paper>

          {/* No Campaigns Message */}
          {reportData.campaigns.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Campaign sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Campaigns Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No campaigns were executed during the selected date range ({reportData.date_range.start} to {reportData.date_range.end}).
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try selecting a different date range or check if campaigns were running during this period.
              </Typography>
            </Paper>
          )}

          {/* Campaigns */}
          {reportData.campaigns.map((campaign, campaignIndex) => (
            <Accordion key={campaign.id} defaultExpanded={campaignIndex === 0}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                  <Campaign sx={{ mr: 2, color: 'primary.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{campaign.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {campaign.objective} • {campaign.id}
                    </Typography>
                  </Box>
                  <Chip 
                    label={campaign.status} 
                    color={getStatusColor(campaign.status)} 
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="h6" color="primary">
                    {formatCurrency(campaign.metrics.spend, campaign.metrics.currency)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {/* Campaign Metrics */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                    Campaign Performance
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={campaign.metrics.impressions.toLocaleString()}
                        label="Impressions"
                        color="#667eea"
                        showSparkline={false}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={campaign.metrics.reach.toLocaleString()}
                        label="Reach"
                        color="#E4405F"
                        showSparkline={false}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={campaign.metrics.clicks.toLocaleString()}
                        label="Clicks"
                        color="#10b981"
                        showSparkline={false}
                      />
                    </Grid>
                    {campaign.metrics.leads > 0 && (
                      <Grid item xs={6} md={2}>
                        <MetricCard
                          value={campaign.metrics.leads.toLocaleString()}
                          label="Leads"
                          color="#8b5cf6"
                          showSparkline={false}
                        />
                      </Grid>
                    )}
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={campaign.metrics.ctr + '%'}
                        label="CTR"
                        color="#1877F2"
                        showSparkline={false}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={formatCurrency(campaign.metrics.cpc, campaign.metrics.currency)}
                        label="CPC"
                        color="#ec4899"
                        showSparkline={false}
                      />
                    </Grid>
                    {campaign.metrics.leads > 0 && (
                      <Grid item xs={6} md={2}>
                        <MetricCard
                          value={formatCurrency(campaign.metrics.cost_per_lead, campaign.metrics.currency)}
                          label="Cost/Lead"
                          color="#a855f7"
                          showSparkline={false}
                        />
                      </Grid>
                    )}
                    <Grid item xs={6} md={2}>
                      <MetricCard
                        value={formatCurrency(campaign.metrics.cpm, campaign.metrics.currency)}
                        label="CPM"
                        color="#f59e0b"
                        showSparkline={false}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Ad Sets */}
                {campaign.ad_sets.map((adSet) => (
                  <Accordion key={adSet.id} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                        <BarChart sx={{ mr: 2, color: 'secondary.main' }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">{adSet.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {adSet.optimization_goal} • {adSet.billing_event}
                          </Typography>
                        </Box>
                        <Chip 
                          label={adSet.status} 
                          color={getStatusColor(adSet.status)} 
                          size="small"
                          sx={{ mr: 2 }}
                        />
                        <Typography variant="h6" color="secondary">
                          {formatCurrency(adSet.metrics.spend, adSet.metrics.currency)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* Ad Set Metrics */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>Ad Set Performance</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={adSet.metrics.impressions.toLocaleString()}
                              label="Impressions"
                              color="#667eea"
                              showSparkline={false}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={(adSet.metrics.reach || 0).toLocaleString()}
                              label="Reach"
                              color="#E4405F"
                              showSparkline={false}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={adSet.metrics.clicks.toLocaleString()}
                              label="Clicks"
                              color="#10b981"
                              showSparkline={false}
                            />
                          </Grid>
                          {adSet.metrics.leads > 0 && (
                            <Grid item xs={6} md={3}>
                              <MetricCard
                                value={adSet.metrics.leads.toLocaleString()}
                                label="Leads"
                                color="#8b5cf6"
                                showSparkline={false}
                              />
                            </Grid>
                          )}
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={adSet.metrics.ctr + '%'}
                              label="CTR"
                              color="#1877F2"
                              showSparkline={false}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={formatCurrency(adSet.metrics.cpc, adSet.metrics.currency)}
                              label="CPC"
                              color="#ec4899"
                              showSparkline={false}
                            />
                          </Grid>
                          {adSet.metrics.leads > 0 && (
                            <Grid item xs={6} md={3}>
                              <MetricCard
                                value={formatCurrency(adSet.metrics.cost_per_lead, adSet.metrics.currency)}
                                label="Cost/Lead"
                                color="#a855f7"
                                showSparkline={false}
                              />
                            </Grid>
                          )}
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={formatCurrency(adSet.metrics.cpm, adSet.metrics.currency)}
                              label="CPM"
                              color="#f59e0b"
                              showSparkline={false}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricCard
                              value={adSet.metrics.frequency + ''}
                              label="Frequency"
                              showProgress={false}
                              color="#06b6d4"
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Audience Targeting Information */}
                      {adSet.targeting && Object.keys(adSet.targeting).length > 0 && (
                        <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Settings sx={{ fontSize: 18 }} />
                            Audience Targeting
                          </Typography>
                          <Grid container spacing={2}>
                            {/* Age Range */}
                            {(adSet.targeting.age_min || adSet.targeting.age_max) && (
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Age Range
                                </Typography>
                                <Chip 
                                  label={`${adSet.targeting.age_min || 18} - ${adSet.targeting.age_max || 65}+`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Grid>
                            )}

                            {/* Genders */}
                            {adSet.targeting.genders && adSet.targeting.genders.length > 0 && (
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Gender
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {adSet.targeting.genders.map((gender, idx) => (
                                    <Chip 
                                      key={idx}
                                      label={gender === 1 ? 'Female' : gender === 2 ? 'Male' : 'All'}
                                      size="small"
                                      color="secondary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Grid>
                            )}

                            {/* Geographic Locations */}
                            {adSet.targeting.geo_locations && (
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Locations
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {adSet.targeting.geo_locations.countries && adSet.targeting.geo_locations.countries.length > 0 && (
                                    adSet.targeting.geo_locations.countries.slice(0, 3).map((country, idx) => (
                                      <Chip 
                                        key={idx}
                                        label={country}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                      />
                                    ))
                                  )}
                                  {adSet.targeting.geo_locations.cities && adSet.targeting.geo_locations.cities.length > 0 && (
                                    adSet.targeting.geo_locations.cities.slice(0, 2).map((city, idx) => (
                                      <Chip 
                                        key={`city-${idx}`}
                                        label={city.name || city}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                      />
                                    ))
                                  )}
                                  {(!adSet.targeting.geo_locations.countries || adSet.targeting.geo_locations.countries.length === 0) &&
                                   (!adSet.targeting.geo_locations.cities || adSet.targeting.geo_locations.cities.length === 0) && (
                                    <Chip 
                                      label="All Locations"
                                      size="small"
                                      color="info"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </Grid>
                            )}

                            {/* Interests */}
                            {adSet.targeting.interests && adSet.targeting.interests.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Interests ({adSet.targeting.interests.length})
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                  {adSet.targeting.interests.slice(0, 8).map((interest, idx) => (
                                    <Chip 
                                      key={idx}
                                      label={interest.name || interest}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                                  ))}
                                  {adSet.targeting.interests.length > 8 && (
                                    <Chip 
                                      label={`+${adSet.targeting.interests.length - 8} more`}
                                      size="small"
                                      color="default"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </Grid>
                            )}

                            {/* Behaviors */}
                            {adSet.targeting.behaviors && adSet.targeting.behaviors.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Behaviors ({adSet.targeting.behaviors.length})
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                  {adSet.targeting.behaviors.slice(0, 8).map((behavior, idx) => (
                                    <Chip 
                                      key={idx}
                                      label={behavior.name || behavior}
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                    />
                                  ))}
                                  {adSet.targeting.behaviors.length > 8 && (
                                    <Chip 
                                      label={`+${adSet.targeting.behaviors.length - 8} more`}
                                      size="small"
                                      color="default"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}

                      {/* Individual Ads */}
                      {adSet.ads.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                            Individual Ads ({adSet.ads.length} ads)
                          </Typography>
                          <Grid container spacing={2}>
                            {adSet.ads.map((ad) => (
                              <Grid item xs={12} key={ad.id}>
                                <Card sx={{ 
                                  border: '1px solid #e0e0e0',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                  '&:hover': {
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  }
                                }}>
                                  <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                        {ad.creative?.image_url && (
                                          <Avatar 
                                            src={ad.creative.image_url} 
                                            variant="rounded" 
                                            sx={{ width: 50, height: 50 }}
                                          />
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {ad.name}
                                          </Typography>
                                          {ad.creative?.title && (
                                            <Typography variant="caption" color="text.secondary">
                                              {ad.creative.title}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                      <Chip 
                                        label={ad.status} 
                                        color={getStatusColor(ad.status)} 
                                        size="small" 
                                      />
                                    </Box>
                                    
                                    <Grid container spacing={2}>
                                      <Grid item xs={6} sm={4} md={2.4}>
                                        <MetricCard
                                          value={formatCurrency(ad.metrics.spend, ad.metrics.currency)}
                                          label="Spend"
                                          color="#667eea"
                                          showSparkline={false}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4} md={2.4}>
                                        <MetricCard
                                          value={ad.metrics.impressions.toLocaleString()}
                                          label="Impressions"
                                          color="#E4405F"
                                          showSparkline={false}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4} md={2.4}>
                                        <MetricCard
                                          value={ad.metrics.clicks.toLocaleString()}
                                          label="Clicks"
                                          color="#10b981"
                                          showSparkline={false}
                                        />
                                      </Grid>
                                      {ad.metrics.leads > 0 && (
                                        <Grid item xs={6} sm={4} md={2.4}>
                                          <MetricCard
                                            value={ad.metrics.leads.toLocaleString()}
                                            label="Leads"
                                            color="#8b5cf6"
                                            showSparkline={false}
                                          />
                                        </Grid>
                                      )}
                                      <Grid item xs={6} sm={4} md={2.4}>
                                        <MetricCard
                                          value={ad.metrics.ctr + '%'}
                                          label="CTR"
                                          color="#1877F2"
                                          showSparkline={false}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4} md={2.4}>
                                        <MetricCard
                                          value={formatCurrency(ad.metrics.cpc, ad.metrics.currency)}
                                          label="CPC"
                                          color="#ec4899"
                                          showSparkline={false}
                                        />
                                      </Grid>
                                      {ad.metrics.leads > 0 && (
                                        <Grid item xs={6} sm={4} md={2.4}>
                                          <MetricCard
                                            value={formatCurrency(ad.metrics.cost_per_lead, ad.metrics.currency)}
                                            label="Cost/Lead"
                                            color="#a855f7"
                                            showSparkline={false}
                                          />
                                        </Grid>
                                      )}
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {!reportData && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Enter your ad account details above to generate a campaign report
          </Typography>
        </Paper>
      )}

      {/* Ad Account Management Dialog */}
      <UnifiedAccountManager
        open={manageDialogOpen}
        onClose={() => {
          setManageDialogOpen(false);
          fetchSavedAdAccounts(); // Refresh the list when dialog closes
        }}
      />
    </Box>
  );
};

export default CampaignAnalytics;

