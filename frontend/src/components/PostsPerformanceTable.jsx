import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  Link,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tooltip,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogContent,
  TextField,
  Grid,
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  Favorite,
  ChatBubble,
  Bookmark,
  OpenInNew,
  PlayArrow,
  Image as ImageIcon,
  ViewCarousel,
  PictureAsPdf,
  TableChart as TableChartIcon,
  Share,
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { reportsAPI } from '../services/api';

const PostsPerformanceTable = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [postsData, setPostsData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchAccounts();
      
      // Check if there's a saved content performance report to load
      const savedReport = sessionStorage.getItem('contentPerformanceReport');
      if (savedReport) {
        try {
          const reportData = JSON.parse(savedReport);
          setPostsData(reportData.data);
          setStartDate(reportData.startDate);
          setEndDate(reportData.endDate);
          
          // Find account by account_id after accounts are loaded
          if (reportData.accountId) {
            const account = accounts.find(acc => acc.account_id === reportData.accountId);
            if (account) {
              setSelectedAccount(account.id.toString());
            }
          }
          
          // Clear the saved report from sessionStorage
          sessionStorage.removeItem('contentPerformanceReport');
        } catch (error) {
          console.error('Error loading saved report:', error);
        }
      } else {
        // Set default date range (last 30 days) only if no saved report
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Separate effect to handle account selection after accounts are loaded
  useEffect(() => {
    const savedReport = sessionStorage.getItem('contentPerformanceReport');
    if (savedReport && accounts.length > 0) {
      try {
        const reportData = JSON.parse(savedReport);
        if (reportData.accountId) {
          const account = accounts.find(acc => acc.account_id === reportData.accountId);
          if (account) {
            setSelectedAccount(account.id.toString());
          }
        }
      } catch (error) {
        console.error('Error setting account from saved report:', error);
      }
    }
  }, [accounts]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/accounts.php`);
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchPostsReport = async () => {
    if (!selectedAccount) {
      alert('Please select an account');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts_report.php`, {
        accountId: selectedAccount,
        startDate: startDate,
        endDate: endDate,
        limit: 10 // Reduced to 10 for faster loading (was 25)
      }, {
        timeout: 60000 // 60 second timeout (fetching insights takes time)
      });

      if (response.data.success) {
        const postsDataToSet = response.data.data;
        setPostsData(postsDataToSet);
        
        // Auto-save the content performance report
        try {
          // Get account details to save with correct platform
          const account = accounts.find(acc => acc.id === parseInt(selectedAccount));
          if (account) {
            const reportToSave = {
              platform: account.platform, // Use actual platform (instagram/facebook)
              platformId: account.account_id,
              startDate: startDate,
              endDate: endDate,
              data: postsDataToSet, // Pass data as object, backend will handle JSON encoding
              type: 'content_performance' // Mark as content performance report
            };

            await reportsAPI.generate(reportToSave);
            console.log('✅ Content performance report auto-saved successfully');
          }
        } catch (saveError) {
          console.error('Error auto-saving content report:', saveError);
          // Don't show error to user - report is still displayed
        }
      } else {
        const errorMsg = response.data.error || 'Failed to fetch posts data';
        console.error('Posts fetch error:', errorMsg);
        alert('❌ ' + errorMsg);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (error.code === 'ECONNABORTED') {
        alert('⏱️ Request timed out. Try reducing the number of posts or check your connection.');
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Error fetching posts data';
        alert('❌ ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMediaIcon = (mediaType) => {
    switch (mediaType?.toUpperCase()) {
      case 'VIDEO':
        return <PlayArrow sx={{ fontSize: 16 }} />;
      case 'CAROUSEL_ALBUM':
        return <ViewCarousel sx={{ fontSize: 16 }} />;
      default:
        return <ImageIcon sx={{ fontSize: 16 }} />;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Clean text function
  const cleanText = (text) => {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
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

  const downloadCSV = () => {
    if (!postsData || !postsData.posts) return;

    const headers = ['Post #', 'Date', 'Caption', 'Type', 'Likes', 'Comments', 'Engagement', 'Engagement Rate', 'Views', 'Saved', 'Shares', 'Link'];
    const rows = postsData.posts.map((post, index) => [
      index + 1,
      formatDate(post.timestamp),
      (post.caption || '').replace(/"/g, '""'),
      post.media_type,
      post.likes,
      post.comments,
      post.engagement,
      post.engagement_rate + '%',
      post.views || 0,
      post.saved || 0,
      post.shares || 0,
      post.permalink
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${postsData.account_name}_posts_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadPDF = async () => {
    if (!postsData) return;

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table width
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(102, 126, 234);
    doc.setFont('helvetica', 'bold');
    doc.text('Content Performance Report', 14, 20);
    
    // Account Info
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(postsData.account_name + ' • ' + postsData.platform.toUpperCase(), 14, 28);
    
    if (postsData.date_range) {
      doc.setTextColor(100, 100, 100);
      doc.text('Period: ' + new Date(postsData.date_range.start).toLocaleDateString() + ' - ' + 
        new Date(postsData.date_range.end).toLocaleDateString() + ' | Total Posts: ' + postsData.total_posts, 14, 34);
    }
    
    // Create table with thumbnails and view links
    const tableData = await Promise.all(postsData.posts.map(async (post, index) => {
      // Format date
      const postDate = new Date(post.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Format caption - show more characters, better wrapping
      const caption = post.caption || 'No caption';
      const cleanedCaption = cleanText(caption);
      const maxCaptionLength = 100; // Increased from 70
      const formattedCaption = cleanedCaption.length > maxCaptionLength 
        ? cleanedCaption.substring(0, maxCaptionLength) + '...' 
        : cleanedCaption;
      
      // Format permalink for view link
      const viewLink = post.permalink || post.media_url || '';
      const shortLink = viewLink.length > 25 ? viewLink.substring(0, 25) + '...' : viewLink;
      
      return [
        (index + 1).toString(),
        'Banner', // Banner placeholder
        postDate,
        post.media_type,
        formattedCaption,
        post.likes.toLocaleString(),
        post.comments.toLocaleString(),
        post.engagement.toLocaleString(),
        post.engagement_rate + '%',
        (post.views && post.views > 0 ? post.views.toLocaleString() : 'N/A'),
        (post.reach && post.reach > 0 ? post.reach.toLocaleString() : 'N/A'),
        (post.saved && post.saved > 0 ? post.saved.toLocaleString() : 'N/A'),
        (post.shares && post.shares > 0 ? post.shares.toLocaleString() : 'N/A'),
        shortLink || 'N/A'
      ];
    }));
    
    // Simplified table structure - split into two tables to prevent breaking
    // Table 1: Main metrics
    const mainTableData = tableData.map(row => [
      row[0], // #
      row[1], // Banner
      row[2], // Date
      row[5], // Likes
      row[6], // Comments
      row[7], // Engagement
      row[8], // ER%
      row[9]  // Views
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Post', 'Date', 'Likes', 'Comments', 'Engagement', 'ER%', 'Views']],
      body: mainTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        cellPadding: 4
      },
      showHead: 'everyPage',
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        valign: 'middle',
        minCellHeight: 18,
        maxCellHeight: 18,
        overflow: 'hidden' // Prevent text breaking into letters
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, // #
        1: { cellWidth: 18, halign: 'center', cellPadding: 1 }, // Banner (thumbnail only)
        2: { cellWidth: 22, halign: 'center', fontSize: 6 }, // Date
        3: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Likes
        4: { cellWidth: 18, halign: 'right' }, // Comments
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [102, 126, 234] }, // Engagement (highlighted)
        6: { cellWidth: 15, halign: 'right' }, // ER%
        7: { cellWidth: 18, halign: 'right' } // Views
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { left: 14, right: 14 },
      tableWidth: 139, // FIXED WIDTH: 8+18+22+18+18+22+15+18 = 139mm
      didDrawCell: async (data) => {
        // Add thumbnail images in the thumbnail column (index 1) - STRICT SIZE
        if (data.section === 'body' && data.column.index === 1) {
          const post = postsData.posts[data.row.index];
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
                  setTimeout(() => reject(new Error('Image load timeout')), 3000);
                });
                
                // STRICT SIZE - 12mm x 12mm
                const imgSize = 12;
                const x = data.cell.x + (data.cell.width - imgSize) / 2;
                const y = data.cell.y + 1;
                
                // Add image to PDF
                doc.addImage(img, 'JPEG', x, y, imgSize, imgSize, undefined, 'FAST');
                
                // Add border
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.2);
                doc.rect(x, y, imgSize, imgSize, 'D');
              }
            } catch (e) {
              // Fallback to placeholder if image fails to load - STRICT SIZE
              const imgSize = 12;
              const x = data.cell.x + (data.cell.width - imgSize) / 2;
              const y = data.cell.y + 1;
              
              doc.setFillColor(240, 240, 240);
              doc.rect(x, y, imgSize, imgSize, 'F');
              doc.setDrawColor(200, 200, 200);
              doc.rect(x, y, imgSize, imgSize, 'S');
              
              doc.setFontSize(5);
              doc.setTextColor(150, 150, 150);
              const icon = post.media_type === 'VIDEO' ? '▶' : post.media_type === 'CAROUSEL_ALBUM' ? '⋮' : '📷';
              doc.text(icon, x + imgSize / 2, y + imgSize / 2 + 1, { align: 'center' });
            }
          }
        }
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 1) {
          hookData.cell.text = [''];
        }
        // Prevent text breaking into letters
        if (hookData.cell.text) {
          hookData.cell.text = hookData.cell.text.map(text => {
            if (typeof text === 'string' && text.length > 20) {
              return text.substring(0, 17) + '...';
            }
            return text;
          });
        }
      }
    });
    
    // Table 2: Additional metrics (if needed)
    let yPos2 = doc.lastAutoTable.finalY + 10;
    if (yPos2 < doc.internal.pageSize.getHeight() - 50) {
      const additionalData = tableData.map(row => [
        row[0], // #
        row[2], // Date
        row[10] || 'N/A', // Reach
        row[11] || '0', // Saved
        row[12] || '0'  // Shares
      ]);
      
      autoTable(doc, {
        startY: yPos2,
        head: [['#', 'Date', 'Reach', 'Saved', 'Shares']],
        body: additionalData,
        theme: 'striped',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 3,
          minCellHeight: 10,
          maxCellHeight: 10,
          overflow: 'hidden'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30, halign: 'center', fontSize: 6 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { left: 14, right: 14 },
        tableWidth: 130
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated: ' + new Date().toLocaleString(), 14, doc.internal.pageSize.getHeight() - 10);
    doc.text('Page 1 of 1', doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    
    // Save PDF
    doc.save(`${postsData.account_name}_content_performance_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📊 Content Performance Report
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Detailed table of all posts with engagement metrics, reach, and impressions
        </Typography>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Select Account</InputLabel>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                label="Select Account"
              >
                <MenuItem value="">-- Choose Account --</MenuItem>
                {accounts.map((account) => (
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
              fullWidth
              variant="contained"
              onClick={fetchPostsReport}
              disabled={loading || !selectedAccount || !startDate || !endDate}
              sx={{ height: 56 }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption">Loading...</Typography>
                </Box>
              ) : 'Generate'}
            </Button>
          </Grid>
        </Grid>

        {postsData && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={downloadPDF}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<TableChartIcon />}
              onClick={downloadCSV}
            >
              Download CSV
            </Button>
          </Box>
        )}
      </Paper>

      {postsData && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {postsData.account_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Posts: {postsData.total_posts} | Total Stories: {postsData.total_stories || 0} | Platform: {postsData.platform.toUpperCase()}
              </Typography>
              {postsData.date_range && (
                <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                  📅 Period: {new Date(postsData.date_range.start).toLocaleDateString()} - {new Date(postsData.date_range.end).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Banner</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <Favorite sx={{ fontSize: 16, mr: 0.5 }} />
                    Likes
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <ChatBubble sx={{ fontSize: 16, mr: 0.5 }} />
                    Comments
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    Engagement
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    Eng. Rate
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
                    Views
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <Bookmark sx={{ fontSize: 16, mr: 0.5 }} />
                    Saved
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    <Share sx={{ fontSize: 16, mr: 0.5 }} />
                    Shares
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {postsData.posts.map((post, index) => (
                  <TableRow key={post.id} hover>
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
                          border: '1px solid #e0e0e0',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        {post.thumbnail_url || post.media_url ? (
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt={post.caption ? post.caption.substring(0, 30) : 'Post thumbnail'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                            onClick={() => window.open(post.permalink || post.media_url, '_blank')}
                          />
                        ) : null}
                        <Box
                          sx={{
                            display: post.thumbnail_url || post.media_url ? 'none' : 'flex',
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
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Tooltip title={post.caption || 'No caption'}>
                        <Typography variant="body2">
                          {truncateCaption(post.caption)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {post.likes.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {post.comments.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={post.engagement.toLocaleString()}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${post.engagement_rate}%`}
                        color={post.engagement_rate > 5 ? 'success' : post.engagement_rate > 2 ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                        {post.views && post.views > 0 ? post.views.toLocaleString() : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.media_type === 'VIDEO' || post.media_type === 'REELS' ? 'plays' : 'views'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {post.saved && post.saved > 0 ? post.saved.toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {post.shares && post.shares > 0 ? post.shares.toLocaleString() : 'N/A'}
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {postsData.posts.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No posts found for this account
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Stories Performance Section */}
      {postsData && postsData.stories && postsData.stories.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              📖 Stories Performance ({postsData.stories.length})
            </Typography>
            <Chip 
              label={`${postsData.stories.length} stories in period`} 
              color="secondary" 
              size="small"
            />
          </Box>
          
          {/* Info about Instagram Stories */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              ℹ️ About Stories Data:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This report shows stories from the <strong>archive database</strong> (if available) and <strong>active stories</strong> from Instagram API. 
              Stories are automatically archived while active. If you see archived stories here, they were captured before expiring. 
              Story insights may show 0 if the story is too new or has fewer than 5 views.
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Story</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Impressions</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Reach</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Replies</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Web Clicks</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Taps Forward</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Taps Back</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Exits</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Completion Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {postsData.stories.map((story, index) => (
                  <TableRow key={story.id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          component="img"
                          src={story.thumbnail_url || story.media_url}
                          alt="Story"
                          sx={{
                            width: 60,
                            height: 60,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 }
                          }}
                          onClick={() => setSelectedImage(story.media_url)}
                        />
                        <Box>
                          <Chip
                            label={story.media_type}
                            size="small"
                            sx={{ mb: 0.5 }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                        {story.impressions?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#E4405F' }}>
                        {story.reach?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                        {story.replies?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f59e0b' }}>
                        {story.web_clicks || story.link_clicks || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {story.taps_forward?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {story.taps_back?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error">
                        {story.exits?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${story.completion_rate || 0}%`}
                        size="small"
                        color={story.completion_rate > 70 ? 'success' : story.completion_rate > 50 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(story.timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <Box
            component="img"
            src={selectedImage}
            alt="Post preview"
            sx={{ width: '100%', height: 'auto' }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PostsPerformanceTable;

