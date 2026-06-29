import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  Delete,
  Instagram,
  Facebook,
  Campaign as CampaignIcon,
  Visibility,
  TableChart,
  PictureAsPdf,
  FileDownload,
  FilterList,
  GetApp,
} from '@mui/icons-material';
import { reportsAPI } from '../services/api';
import ReportViewer from './ReportViewer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CuratedReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState(new Set());

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getAll();
      // Filter out Facebook reports as per previous requirements
      const filteredReports = (response.data.data || []).filter(
        report => report.platform !== 'facebook' || report.type === 'content_performance'
      );
      setReports(filteredReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
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

  const handleViewReport = (report) => {
    if (report.type === 'content_performance') {
      const reportData = JSON.parse(report.data);
      sessionStorage.setItem('contentPerformanceReport', JSON.stringify({
        data: reportData,
        startDate: report.start_date,
        endDate: report.end_date,
        accountId: report.platform_id
      }));
      window.location.href = '/posts';
      return;
    }

    const reportData = {
      dates: { start: report.start_date, end: report.end_date },
      metrics: JSON.parse(report.data)
    };
    setSelectedReport(reportData);
    setShowReportViewer(true);
  };

  const getReportTypeLabel = (report) => {
    if (report.type === 'content_performance') return 'Content Performance';
    if (report.type === 'campaigns') return 'Campaign';
    return 'Organic';
  };

  const getReportTypeColor = (report) => {
    if (report.type === 'content_performance') return '#10b981';
    if (report.type === 'campaigns') return '#667eea';
    return '#E4405F';
  };

  const getReportIcon = (report) => {
    if (report.type === 'content_performance') return <TableChart sx={{ fontSize: 20 }} />;
    if (report.type === 'campaigns') return <CampaignIcon sx={{ fontSize: 20 }} />;
    if (report.platform === 'instagram') return <Instagram sx={{ fontSize: 20 }} />;
    return <Facebook sx={{ fontSize: 20 }} />;
  };

  const getFilteredReports = () => {
    let filtered = reports;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => {
        if (filterType === 'organic') return !r.type || r.type === 'organic';
        return r.type === filterType;
      });
    }

    // Filter by platform
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(r => r.platform === filterPlatform);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(r => {
        const reportDate = new Date(r.created_at);
        const diffDays = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'today') return diffDays === 0;
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.platform?.toLowerCase().includes(term) ||
        getReportTypeLabel(r).toLowerCase().includes(term) ||
        r.start_date?.includes(term) ||
        r.end_date?.includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const downloadReportPDF = async (report) => {
    if (report.type === 'content_performance') {
      alert('Please use the "View Report" option to download Content Performance reports as PDF');
      return;
    }

    setDownloadingReports(prev => new Set(prev).add(report.id));
    try {
      const reportData = {
        dates: { start: report.start_date, end: report.end_date },
        metrics: JSON.parse(report.data)
      };

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(`${getReportTypeLabel(report)} Report - ${report.platform.toUpperCase()}`, 14, 22);
      
      // Date range
      doc.setFontSize(12);
      doc.text(`Period: ${report.start_date} to ${report.end_date}`, 14, 30);
      doc.text(`Generated: ${new Date(report.created_at).toLocaleString()}`, 14, 37);

      let yPos = 45;

      // Metrics Table
      if (reportData.metrics.organic) {
        doc.setFontSize(14);
        doc.text('Organic Metrics', 14, yPos);
        yPos += 8;

        const organicData = [];
        Object.entries(reportData.metrics.organic).forEach(([key, value]) => {
          organicData.push([
            key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            typeof value === 'number' ? value.toLocaleString() : String(value)
          ]);
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: organicData,
          theme: 'striped',
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }

      if (reportData.metrics.inorganic) {
        doc.setFontSize(14);
        doc.text('Paid/Inorganic Metrics', 14, yPos);
        yPos += 8;

        const inorganicData = [];
        Object.entries(reportData.metrics.inorganic).forEach(([key, value]) => {
          inorganicData.push([
            key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            typeof value === 'number' ? value.toLocaleString() : String(value)
          ]);
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: inorganicData,
          theme: 'striped',
        });
      }

      const filename = `${getReportTypeLabel(report)}_${report.platform}_${report.start_date}_to_${report.end_date}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setDownloadingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
    }
  };

  const downloadReportCSV = (report) => {
    if (report.type === 'content_performance') {
      alert('Please use the "View Report" option to download Content Performance reports as CSV');
      return;
    }

    try {
      const reportData = JSON.parse(report.data);
      const headers = ['Metric Type', 'Metric', 'Value'];
      const rows = [];

      if (reportData.organic) {
        Object.entries(reportData.organic).forEach(([key, value]) => {
          rows.push(['Organic', key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), value]);
        });
      }

      if (reportData.inorganic) {
        Object.entries(reportData.inorganic).forEach(([key, value]) => {
          rows.push(['Inorganic', key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), value]);
        });
      }

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${getReportTypeLabel(report)}_${report.platform}_${report.start_date}_to_${report.end_date}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV');
    }
  };

  const downloadAllReports = async () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      alert('No reports to download');
      return;
    }

    if (!window.confirm(`Download ${filtered.length} report(s) as PDFs?`)) {
      return;
    }

    for (const report of filtered) {
      if (report.type !== 'content_performance') {
        await downloadReportPDF(report);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    alert(`✅ Downloaded ${filtered.filter(r => r.type !== 'content_performance').length} report(s)`);
  };

  const filteredReports = getFilteredReports();

  const groupedByType = {
    organic: filteredReports.filter(r => !r.type || r.type === 'organic'),
    content_performance: filteredReports.filter(r => r.type === 'content_performance'),
    campaigns: filteredReports.filter(r => r.type === 'campaigns'),
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          📊 Curated Reports Hub
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and download all your reports in one place
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search Reports"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <FilterList sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Report Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="organic">Organic</MenuItem>
                <MenuItem value="content_performance">Content Performance</MenuItem>
                <MenuItem value="campaigns">Campaigns</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                label="Platform"
              >
                <MenuItem value="all">All Platforms</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<GetApp />}
              onClick={downloadAllReports}
              disabled={filteredReports.length === 0}
              sx={{ height: '56px' }}
            >
              Download All ({filteredReports.filter(r => r.type !== 'content_performance').length})
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {groupedByType.organic.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organic Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#10b981' }}>
                {groupedByType.content_performance.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Content Performance Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#667eea' }}>
                {groupedByType.campaigns.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Campaign Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reports Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredReports.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No reports found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchTerm || filterType !== 'all' || filterPlatform !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Generate reports from the dashboard to see them here'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Report</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Generated</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getReportIcon(report)}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Report #{report.id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getReportTypeLabel(report)}
                      size="small"
                      sx={{
                        bgcolor: getReportTypeColor(report),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>
                      {report.platform}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.start_date} to {report.end_date}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(report.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="View Report">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewReport(report)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {report.type !== 'content_performance' && (
                        <>
                          <Tooltip title="Download PDF">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => downloadReportPDF(report)}
                              disabled={downloadingReports.has(report.id)}
                            >
                              {downloadingReports.has(report.id) ? (
                                <CircularProgress size={16} />
                              ) : (
                                <PictureAsPdf />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download CSV">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => downloadReportCSV(report)}
                            >
                              <FileDownload />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete Report">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Report Viewer Modal */}
      {showReportViewer && selectedReport && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '70%',
            bgcolor: 'background.paper',
            boxShadow: 24,
            overflow: 'auto',
            zIndex: 1300,
          }}
        >
          <ReportViewer
            reportData={selectedReport}
            onClose={() => {
              setShowReportViewer(false);
              setSelectedReport(null);
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default CuratedReports;

