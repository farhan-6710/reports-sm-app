import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import { Download, TrendingUp, TrendingDown, AccountCircle, Edit, AddCircle, Delete, Visibility, Compare, ShowChart } from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reportsAPI, accountsAPI } from '../services/api';
import { downloadPDF, downloadExcel } from '../utils/downloadHelper';
import UnifiedAccountManager from './UnifiedAccountManager';
import NotificationCenter from './NotificationCenter';
import ReportViewer from './ReportViewer';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [comparisonData, setComparisonData] = useState(null);
  const [platformId, setPlatformId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [organicFormOpen, setOrganicFormOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [enhancedReportOpen, setEnhancedReportOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReports();
    fetchSavedAccounts();
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const fetchReports = async () => {
    try {
      const response = await reportsAPI.getAll();
      // Filter out Facebook reports - only show Instagram and other platforms
      const filteredReports = (response.data.data || []).filter(
        report => report.platform !== 'facebook'
      );
      setReports(filteredReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchSavedAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      // Filter out Facebook accounts - only show Instagram and other platforms
      const filteredAccounts = (response.data.data || []).filter(
        account => account.platform !== 'facebook'
      );
      setSavedAccounts(filteredAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
    const account = savedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setPlatformId(account.account_id);
      setAccessToken(account.access_token);
      setSelectedPlatform(account.platform);
    }
  };

  const handleViewReport = (report) => {
    // Check if this is a content performance report
    if (report.type === 'content_performance') {
      // For content performance reports, redirect to posts page with the report data
      const reportData = JSON.parse(report.data);
      // Store report data in sessionStorage to pass to PostsPerformanceTable
      sessionStorage.setItem('contentPerformanceReport', JSON.stringify({
        data: reportData,
        startDate: report.start_date,
        endDate: report.end_date,
        accountId: report.platform_id
      }));
      // Navigate to posts page
      window.location.href = '/posts';
      return;
    }
    
    // For organic reports, use the ReportViewer
    const reportData = {
      dates: { start: report.start_date, end: report.end_date },
      metrics: JSON.parse(report.data)
    };
    setCurrentReport(reportData);
    setShowReportViewer(true);
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await reportsAPI.delete(reportId);
        alert('✅ Report deleted successfully!');
        fetchReports();
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report');
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedAccount) {
      alert('Please select an account first');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }
    
    setLoading(true);
    try {
      const response = await reportsAPI.generateFromAccount(
        selectedAccount,
        startDate,
        endDate
      );
      
      if (response.data.success) {
        alert('✅ Report generated successfully!');
        await fetchReports();
        
        console.log('Report response:', response.data);
        
        // Show the report viewer with the generated data
        const reportData = {
          dates: {
            start: response.data.dates?.start || startDate,
            end: response.data.dates?.end || endDate
          },
          metrics: response.data.data || {}  // This contains {organic: {...}, inorganic: {...}}
        };
        
        console.log('Setting report data:', reportData);
        setCurrentReport(reportData);
        setShowReportViewer(true);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMsg = error.response?.data?.error || 'Failed to generate report. Please check your credentials.';
      alert('❌ ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    if (!selectedAccount) {
      alert('Please select an account first');
      return;
    }
    
    const account = savedAccounts.find(acc => acc.id === parseInt(selectedAccount));
    if (!account) {
      alert('Account not found');
      return;
    }
    
    setLoading(true);
    try {
      // Map selectedPeriod to periodType
      const periodTypeMap = {
        'week': 'weekly',
        'month': 'monthly',
        'quarter': 'quarterly'
      };
      const periodType = periodTypeMap[selectedPeriod] || 'monthly';
      
      const response = await reportsAPI.getFrequencyComparison(
        account.id,
        periodType,
        startDate,
        endDate
      );
      
      if (response.data.success) {
        setComparisonData(response.data.data);
        setSelectedPlatform(account.platform || 'instagram');
        setPlatformId(account.account_id);
        setAccessToken(account.access_token);
        alert('✅ Comparison data generated successfully!');
      } else {
        throw new Error(response.data.error || 'Failed to generate comparison');
      }
    } catch (error) {
      console.error('Error fetching comparison:', error);
      alert('Failed to fetch comparison data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadComparisonPDF = () => {
    if (!comparisonData) {
      alert('No comparison data available. Please generate comparison first.');
      return;
    }

    const { jsPDF } = require('jspdf');
    const autoTable = require('jspdf-autotable').default;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Period Comparison Report', 14, 22);
    
    // Period info
    doc.setFontSize(12);
    const periodLabel = selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Quarterly';
    doc.text(`Frequency: ${periodLabel}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    
    let yPos = 45;
    
    // Current Period Data
    doc.setFontSize(14);
    doc.text('Current Period', 14, yPos);
    yPos += 8;
    
    const currentData = [];
    if (comparisonData.current && comparisonData.current.organic) {
      Object.entries(comparisonData.current.organic).forEach(([key, value]) => {
        currentData.push([
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          typeof value === 'number' ? value.toLocaleString() : String(value)
        ]);
      });
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: currentData,
      theme: 'striped',
    });
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Previous Period Data
    doc.setFontSize(14);
    doc.text('Previous Period', 14, yPos);
    yPos += 8;
    
    const previousData = [];
    if (comparisonData.previous && comparisonData.previous.organic) {
      Object.entries(comparisonData.previous.organic).forEach(([key, value]) => {
        previousData.push([
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          typeof value === 'number' ? value.toLocaleString() : String(value)
        ]);
      });
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: previousData,
      theme: 'striped',
    });
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Growth Comparison
    doc.setFontSize(14);
    doc.text('Growth Comparison', 14, yPos);
    yPos += 8;
    
    const growthData = [];
    if (comparisonData.growth) {
      Object.entries(comparisonData.growth).forEach(([key, value]) => {
        const percentChange = typeof value === 'object' && value.percent_change !== undefined 
          ? value.percent_change 
          : value;
        growthData.push([
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%`
        ]);
      });
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Growth %']],
      body: growthData,
      theme: 'striped',
    });
    
    const filename = `Comparison_Report_${periodLabel}_${new Date().getTime()}.pdf`;
    doc.save(filename);
    alert('✅ Comparison report downloaded successfully!');
  };

  const getStartDate = (period) => {
    const now = new Date();
    if (period === 'week') {
      return new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    }
    return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
  };

  const renderGrowthIcon = (value) => {
    if (value > 0) return <TrendingUp sx={{ color: 'green' }} />;
    if (value < 0) return <TrendingDown sx={{ color: 'red' }} />;
    return null;
  };

  const renderGrowthPercentage = (value) => {
    const absValue = Math.abs(value);
    const color = value > 0 ? 'green' : value < 0 ? 'red' : 'gray';
    return (
      <Typography variant="h6" sx={{ color, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {renderGrowthIcon(value)} {absValue}%
      </Typography>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Report Generation */}
      <Box sx={{ 
        width: showReportViewer ? '400px' : '100%', 
        transition: 'width 0.3s ease',
        overflow: 'auto',
        p: 4,
        borderRight: showReportViewer ? '1px solid #e0e0e0' : 'none'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Organic Reports
          </Typography>
          <NotificationCenter />
        </Box>

      {/* Configuration Panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Generate Automated Report</Typography>
        
        {savedAccounts.length > 0 ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Account</InputLabel>
                  <Select
                    value={selectedAccount}
                    onChange={(e) => handleAccountSelect(e.target.value)}
                    label="Select Account"
                  >
                    <MenuItem value="">-- Choose Account --</MenuItem>
                    {savedAccounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.account_name} ({account.platform})
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
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleGenerateReport}
                  disabled={loading || !selectedAccount || !startDate || !endDate}
                  sx={{ height: '56px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate'}
                </Button>
              </Grid>
            </Grid>
            
            {/* Fixed Frequency Comparison Section */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Compare /> Period Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Compare current period with previous period based on fixed frequency
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Comparison Frequency</InputLabel>
                    <Select
                      value={selectedPeriod}
                      onChange={(e) => {
                        setSelectedPeriod(e.target.value);
                        // Auto-calculate dates based on frequency
                        const end = new Date();
                        let start = new Date();
                        if (e.target.value === 'week') {
                          start.setDate(start.getDate() - 7);
                        } else if (e.target.value === 'month') {
                          start.setMonth(start.getMonth() - 1);
                        } else if (e.target.value === 'quarter') {
                          start.setMonth(start.getMonth() - 3);
                        }
                        setEndDate(end.toISOString().split('T')[0]);
                        setStartDate(start.toISOString().split('T')[0]);
                      }}
                      label="Comparison Frequency"
                    >
                      <MenuItem value="week">Weekly (Last 7 Days)</MenuItem>
                      <MenuItem value="month">Monthly (Last 30 Days)</MenuItem>
                      <MenuItem value="quarter">Quarterly (Last 90 Days)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={fetchComparison}
                    disabled={!selectedAccount || !selectedPlatform || !platformId || !accessToken}
                    startIcon={<ShowChart />}
                    sx={{ height: '56px' }}
                  >
                    Generate Comparison
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  {comparisonData && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="success"
                      onClick={downloadComparisonPDF}
                      startIcon={<Download />}
                      sx={{ height: '56px' }}
                    >
                      Download Comparison PDF
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No accounts connected yet
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setAccountDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Connect Account
            </Button>
          </Box>
        )}
      </Paper>

      {/* Comparison Metrics */}
      {comparisonData && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Growth Comparison ({selectedPeriod === 'week' ? 'Week-over-Week' : 'Month-over-Month'})
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(comparisonData.growth || {}).map(([key, value]) => (
              <Grid item xs={6} md={3} key={key}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      {key.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Typography>
                    {renderGrowthPercentage(value)}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Charts */}
      {comparisonData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current vs Previous Period
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Current', ...comparisonData.current.organic },
                    { name: 'Previous', ...comparisonData.previous.organic },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" fill="#8884d8" />
                    <Bar dataKey="reach" fill="#82ca9d" />
                    <Bar dataKey="engaged_users" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { period: 'Previous', value: Object.values(comparisonData.previous.organic).reduce((a, b) => a + b, 0) },
                    { period: 'Current', value: Object.values(comparisonData.current.organic).reduce((a, b) => a + b, 0) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Recent Reports */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Recent Reports</Typography>
        </Box>
        <Grid container spacing={2}>
          {reports.slice(0, 6).map((report) => (
            <Grid item xs={12} md={4} key={report.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        {report.type === 'content_performance' ? 'Content Performance' : report.platform.toUpperCase()}
                      </Typography>
                      {report.type === 'content_performance' && (
                        <Chip 
                          label={report.platform.toUpperCase()} 
                          size="small" 
                          color="primary" 
                          sx={{ mt: 0.5, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteReport(report.id)}
                      title="Delete report"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {report.start_date} to {report.end_date}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Generated: {new Date(report.created_at).toLocaleString()}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewReport(report)}
                    >
                      View Report
                    </Button>
                    <Chip 
                      label="View to Download PDF" 
                      size="small"
                      color="info"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
      </Box>

      {/* Right Panel - Report Viewer */}
      {showReportViewer && currentReport && (
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f5f7fa' }}>
          <ReportViewer 
            reportData={currentReport}
            onClose={() => setShowReportViewer(false)}
          />
        </Box>
      )}

      <UnifiedAccountManager
        open={accountDialogOpen}
        onClose={() => {
          setAccountDialogOpen(false);
          fetchSavedAccounts(); // Reload accounts after closing
        }}
      />

    </Box>
  );
};

export default Dashboard;

