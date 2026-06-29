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
} from '@mui/material';
import { Download, Delete, Instagram, Facebook, Campaign as CampaignIcon, Visibility, TableChart } from '@mui/icons-material';
import { reportsAPI } from '../services/api';
import { downloadPDF, downloadExcel } from '../utils/downloadHelper';
import ReportViewer from './ReportViewer';

const ReportsView = ({ filterType = 'all' }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState(filterType);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportViewer, setShowReportViewer] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getAll();
      setReports(response.data.data || []);
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
    
    // For other reports, use the ReportViewer
    const reportData = {
      dates: { start: report.start_date, end: report.end_date },
      metrics: JSON.parse(report.data)
    };
    setSelectedReport(reportData);
    setShowReportViewer(true);
  };

  const getFilteredReports = () => {
    if (filterPlatform === 'all') return reports;
    if (filterPlatform === 'instagram') return reports.filter(r => r.platform === 'instagram' && r.type !== 'content_performance');
    if (filterPlatform === 'facebook') return reports.filter(r => r.platform === 'facebook');
    if (filterPlatform === 'campaigns') return reports.filter(r => r.platform === 'campaigns');
    if (filterPlatform === 'content_performance') return reports.filter(r => r.type === 'content_performance');
    return reports;
  };

  const getPlatformIcon = (platform, type) => {
    if (type === 'content_performance') return <TableChart sx={{ fontSize: 20 }} />;
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram sx={{ fontSize: 20 }} />;
      case 'facebook': return <Facebook sx={{ fontSize: 20 }} />;
      case 'campaigns': return <CampaignIcon sx={{ fontSize: 20 }} />;
      default: return null;
    }
  };

  const getPlatformColor = (platform, type) => {
    if (type === 'content_performance') return '#10b981';
    switch (platform.toLowerCase()) {
      case 'instagram': return '#E4405F';
      case 'facebook': return '#1877F2';
      case 'campaigns': return '#667eea';
      default: return '#666';
    }
  };

  const getTitle = () => {
    switch (filterType) {
      case 'instagram': return 'Instagram Reports';
      case 'facebook': return 'Facebook Reports';
      case 'campaigns': return 'Campaign Reports';
      case 'content_performance': return 'Content Performance Reports';
      default: return 'All Reports';
    }
  };

  const filteredReports = getFilteredReports();

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {getTitle()}
        </Typography>
        {filterType === 'all' && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Platform</InputLabel>
            <Select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              label="Filter by Platform"
            >
              <MenuItem value="all">All Platforms</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="facebook">Facebook</MenuItem>
              <MenuItem value="campaigns">Campaigns</MenuItem>
              <MenuItem value="content_performance">Content Performance</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {filteredReports.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No reports found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Generate reports from the dashboard to see them here
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredReports.map((report) => (
            <Grid item xs={12} md={6} lg={4} key={report.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderTop: `4px solid ${getPlatformColor(report.platform, report.type)}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(report.platform, report.type)}
                      <Typography variant="h6" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {report.type === 'content_performance' ? 'Content Performance' : report.platform}
                      </Typography>
                      {report.type === 'content_performance' && (
                        <Chip 
                          label={report.platform.toUpperCase()} 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
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

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Period:</strong> {report.start_date} to {report.end_date}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Generated: {new Date(report.created_at).toLocaleString()}
                  </Typography>

                  <Chip 
                    label={`Report #${report.id}`} 
                    size="small" 
                    sx={{ mb: 2 }}
                    color="primary"
                    variant="outlined"
                  />

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewReport(report)}
                      fullWidth
                    >
                      View Report
                    </Button>
                    <Chip 
                      label="View Report to Download PDF" 
                      size="small"
                      color="info"
                      sx={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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

      {/* Overlay */}
      {showReportViewer && (
        <Box
          onClick={() => {
            setShowReportViewer(false);
            setSelectedReport(null);
          }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1299,
          }}
        />
      )}
    </Box>
  );
};

export default ReportsView;

