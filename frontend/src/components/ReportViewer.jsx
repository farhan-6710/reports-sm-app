import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Stack,
  Alert,
  AlertTitle,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  ThumbUp,
  Visibility,
  Share,
  Comment,
  Favorite,
  Instagram,
  Facebook,
  Download,
  CalendarToday,
  Assessment,
  InfoOutlined,
  PlayArrow,
  OpenInNew,
  Close,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';
import { downloadPDF, downloadExcel } from '../utils/downloadHelper';

const ReportViewer = ({ reportData, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!reportData || !reportData.metrics) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No report data available
        </Typography>
      </Paper>
    );
  }

  const { dates, metrics } = reportData;
  const { organic, inorganic } = metrics;

  // Download UI as PDF using browser print
  const downloadUIAsPDF = () => {
    // Use browser's native print functionality for best quality
    window.print();
  };

  // Calculate insights
  const calculateEngagementRate = () => {
    if (!organic?.followers || organic.followers === 0) return 0;
    return ((organic.engagement / organic.followers) * 100).toFixed(2);
  };

  const calculateAverageEngagementPerPost = () => {
    if (!organic?.posts || organic.posts === 0) return 0;
    return Math.round(organic.engagement / organic.posts);
  };

  const getPerformanceLevel = (rate) => {
    if (rate >= 5) return { level: 'Excellent', color: '#10b981', description: 'Outstanding performance' };
    if (rate >= 3) return { level: 'Good', color: '#667eea', description: 'Above average performance' };
    if (rate >= 1) return { level: 'Average', color: '#f59e0b', description: 'Room for improvement' };
    return { level: 'Needs Improvement', color: '#ef4444', description: 'Requires attention' };
  };

  const engagementRate = calculateEngagementRate();
  const avgEngagementPerPost = calculateAverageEngagementPerPost();
  const performance = getPerformanceLevel(parseFloat(engagementRate));

  // Prepare chart data (exclude followers to avoid scale issues)
  const metricsOverview = [
    { name: 'Total Engagement', value: organic?.total_engagement || 0, color: '#667eea' },
    { name: 'Likes', value: organic?.total_likes || 0, color: '#10b981' },
    { name: 'Comments', value: organic?.total_comments || 0, color: '#f59e0b' },
    { name: 'Total Views', value: organic?.total_views || 0, color: '#ec4899' },
  ];

  // Calculate engagement breakdown from backend totals
  const calculateEngagementBreakdown = () => {
    // Use total metrics from backend for accurate counts
    const totalLikes = organic?.total_likes || 0;
    const totalComments = organic?.total_comments || 0;

    const total = totalLikes + totalComments;

    // Only show likes and comments (the main engagement metrics we track)
    const breakdown = [
      { name: 'Likes', value: totalLikes, percentage: 0 },
      { name: 'Comments', value: totalComments, percentage: 0 },
    ].map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    }));

    // Filter out zero values to avoid clutter
    return breakdown.filter(item => item.value > 0);
  };

  const engagementBreakdown = calculateEngagementBreakdown();

  const performanceMetrics = [
    { metric: 'Engagement Rate', value: engagementRate, fullMark: 10 },
    { metric: 'Content Quality', value: 7.5, fullMark: 10 },
    { metric: 'Audience Growth', value: 6.8, fullMark: 10 },
    { metric: 'Reach', value: 8.2, fullMark: 10 },
    { metric: 'Interaction', value: 7.0, fullMark: 10 },
  ];

  // Calculate day-of-week engagement from ALL posts (not just top 5)
  const calculateDailyTrend = () => {
    const posts = organic?.all_posts_summary || [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize data for each day of the week
    const dayData = dayNames.map(name => ({
      day: name,
      engagement: 0,
      reach: 0,
      posts: 0
    }));

    // Aggregate data by day of week
    posts.forEach(post => {
      if (post.timestamp) {
        const date = new Date(post.timestamp);
        const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        dayData[dayIndex].engagement += (post.likes || 0) + (post.comments || 0);
        dayData[dayIndex].reach += post.reach || 0;
        dayData[dayIndex].posts += 1;
      }
    });

    // If no data, return empty array
    if (posts.length === 0) {
      return dayNames.map(name => ({ day: name, engagement: 0, reach: 0, posts: 0 }));
    }

    return dayData;
  };

  const dailyTrend = calculateDailyTrend();

  const COLORS = ['#667eea', '#E4405F', '#10b981', '#f59e0b', '#8b5cf6'];

  const MetricCard = ({ title, value, subtitle, icon, color, trend, info }) => (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              {info && (
                <Tooltip title={info} arrow placement="top">
                  <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color, mb: 0.5 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend >= 0 ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}
                >
                  {Math.abs(trend)}% vs previous period
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ height: '100%', overflow: 'auto', bgcolor: '#f5f7fa', p: 3 }}>
      <Box id="report-content">
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              Social Media Performance Report
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<CalendarToday sx={{ fontSize: 16 }} />}
                label={`${dates?.start || 'N/A'} to ${dates?.end || 'N/A'}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`${performance.level} Performance`}
                sx={{ bgcolor: `${performance.color}15`, color: performance.color, fontWeight: 600 }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={downloadUIAsPDF}
              className="no-print"
            >
              Print / Download PDF
            </Button>
            <IconButton onClick={onClose} sx={{ ml: 1 }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Executive Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment /> Executive Summary
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>Performance Overview</AlertTitle>
          During the reporting period from <strong>{dates?.start}</strong> to <strong>{dates?.end}</strong>, 
          your social media presence demonstrated <strong>{performance.level.toLowerCase()}</strong> performance 
          with an engagement rate of <strong>{engagementRate}%</strong>. {performance.description}.
        </Alert>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          Your account reached a total of <strong>{(organic?.followers || 0).toLocaleString()} Current Followers</strong>, 
          generating <strong>{(organic?.total_engagement || 0).toLocaleString()} total engagements</strong> across 
          all content. This translates to an average of <strong>{avgEngagementPerPost.toLocaleString()} 
          engagements per post</strong>, indicating {engagementRate >= 3 ? 'strong' : 'moderate'} audience 
          interaction with your content.
        </Typography>
        {engagementBreakdown.length >= 2 && (
          <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
            The engagement breakdown shows that <strong>likes</strong> constitute the majority of interactions 
            at {engagementBreakdown[0]?.percentage || 0}%, followed by <strong>comments</strong> at {engagementBreakdown[1]?.percentage || 0}%. 
            This pattern suggests that while your content is well-received, there's an opportunity to encourage 
            more meaningful interactions through strategic calls-to-action and conversation starters.
          </Typography>
        )}
      </Paper>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Followers"
            value={organic?.followers || 0}
            subtitle="Audience size"
            icon={<People />}
            color="#667eea"
            info="The total number of accounts following your profile. This represents your potential audience reach and brand awareness."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="New Followers"
            value={organic?.new_followers !== null && organic?.new_followers !== undefined ? organic.new_followers : 'N/A'}
            subtitle={organic?.new_followers !== null ? "Growth in period" : "Data not available"}
            icon={<TrendingUp />}
            color="#10b981"
            info="New Current Followers gained during the selected period. Indicates your content's ability to attract new audience members. Note: This metric requires instagram_manage_insights permission and may not be available for all accounts."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Engagement"
            value={organic?.total_engagement || 0}
            subtitle={`${organic?.engagement_rate || 0}% rate`}
            icon={<ThumbUp />}
            color="#E4405F"
            info="The sum of all interactions (likes, comments, shares, saves) on your content. Higher engagement indicates content resonance with your audience."
          />
        </Grid>
      </Grid>

      {/* Additional Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Views"
            value={organic?.total_views || 0}
            subtitle="All content views"
            icon={<Visibility />}
            color="#ec4899"
            info="Total views across all content: video plays, reel plays, and image impressions. This represents how many times your content was seen."
          />
        </Grid>
      </Grid>

      {/* Content Breakdown */}
      {(organic?.photos_count || organic?.videos_count || organic?.stories_count) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            📊 Content Breakdown
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, borderTop: '3px solid #667eea' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#667eea', mb: 1 }}>
                  {organic?.photos_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Photos Posted
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, borderTop: '3px solid #E4405F' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#E4405F', mb: 1 }}>
                  {organic?.videos_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Videos Posted
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, borderTop: '3px solid #10b981' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#10b981', mb: 1 }}>
                  {organic?.reels_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reels Posted
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, borderTop: '3px solid #f59e0b' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#f59e0b', mb: 1 }}>
                  {organic?.stories_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stories Posted
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Top 5 Posts */}
      {organic?.top_posts && organic.top_posts.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            🏆 Top 5 Performing Posts
          </Typography>
          <Grid container spacing={2}>
            {organic.top_posts.map((post, index) => (
              <Grid item xs={12} key={post.id}>
                <Card sx={{ display: 'flex', p: 2, '&:hover': { boxShadow: 3 } }}>
                  <Box sx={{ width: 100, height: 100, mr: 2, flexShrink: 0 }}>
                    <img 
                      src={post.thumbnail_url || post.media_url} 
                      alt={`Post ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        #{index + 1} - {post.media_type}
                      </Typography>
                      <Chip 
                        label={`${post.engagement_rate}% ER`} 
                        size="small" 
                        sx={{ bgcolor: '#10b98115', color: '#10b981', fontWeight: 600 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
                      {post.caption?.substring(0, 100)}{post.caption?.length > 100 ? '...' : ''}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#E4405F' }}>
                            {post.likes?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Likes
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                            {post.comments?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Comments
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f59e0b' }}>
                            {post.views?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Views
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                            {post.engagement?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Engagement
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            href={post.permalink} 
                            target="_blank"
                            sx={{ fontSize: '0.7rem' }}
                          >
                            View Post
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Top 5 Stories */}
      {organic?.top_stories && organic.top_stories.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            ⭐ Top 5 Performing Stories
          </Typography>
          <Grid container spacing={2}>
            {organic.top_stories.map((story, index) => (
              <Grid item xs={12} sm={6} md={2.4} key={story.id}>
                <Card sx={{ textAlign: 'center', '&:hover': { boxShadow: 3 } }}>
                  <Box sx={{ position: 'relative', paddingTop: '177.78%', bgcolor: '#f5f5f5' }}>
                    <img 
                      src={story.thumbnail_url || story.media_url} 
                      alt={`Story ${index + 1}`}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                    <Chip 
                      label={`#${index + 1}`} 
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        bgcolor: 'rgba(0,0,0,0.7)', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                          {story.impressions?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Impressions
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#E4405F' }}>
                          {story.reach?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reach
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {story.replies || 0} replies
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}


      {/* Content Performance Section - Stories */}
      {metrics?.content_performance?.stories && metrics.content_performance.stories.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              📖 Stories Performance ({metrics.content_performance.stories.length})
            </Typography>
            <Chip 
              label={`${metrics.content_performance.stories.length} stories in period`} 
              color="primary" 
              size="small"
            />
          </Box>
          
          {/* Stories Table with All KPIs */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Story</strong></TableCell>
                  <TableCell align="right"><strong>Impressions</strong></TableCell>
                  <TableCell align="right"><strong>Reach</strong></TableCell>
                  <TableCell align="right"><strong>Replies</strong></TableCell>
                  <TableCell align="right"><strong>Web Clicks</strong></TableCell>
                  <TableCell align="right"><strong>Taps Forward</strong></TableCell>
                  <TableCell align="right"><strong>Taps Back</strong></TableCell>
                  <TableCell align="right"><strong>Exits</strong></TableCell>
                  <TableCell align="right"><strong>Completion Rate</strong></TableCell>
                  <TableCell align="right"><strong>Date</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.content_performance.stories.map((story) => (
                  <TableRow key={story.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <img 
                          src={story.thumbnail_url || story.media_url} 
                          alt="Story"
                          style={{ 
                            width: 60, 
                            height: 60, 
                            objectFit: 'cover', 
                            borderRadius: '8px' 
                          }}
                        />
                        <Typography variant="body2">
                          {story.media_type}
                        </Typography>
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
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(story.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Fallback: All Stories Posted in Period (if content_performance not available) */}
      {!metrics?.content_performance?.stories && organic?.all_stories && organic.all_stories.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              📖 All Stories Posted ({organic.all_stories.length})
            </Typography>
            <Chip 
              label={`${organic.all_stories.length} stories in selected period`} 
              color="primary" 
              size="small"
            />
          </Box>
          <Grid container spacing={2}>
            {organic.all_stories.map((story, index) => (
              <Grid item xs={12} sm={6} md={3} lg={2.4} key={story.id}>
                <Card sx={{ '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 0.3s' }}>
                  <Box sx={{ position: 'relative', paddingTop: '177.78%', bgcolor: '#f5f5f5' }}>
                    <img 
                      src={story.thumbnail_url || story.media_url} 
                      alt={`Story ${index + 1}`}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                    <Chip 
                      label={story.media_type} 
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8, 
                        bgcolor: 'rgba(0,0,0,0.7)', 
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {new Date(story.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#667eea', fontSize: '0.85rem' }}>
                          {story.impressions?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Views
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#E4405F', fontSize: '0.85rem' }}>
                          {story.reach?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Reach
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.85rem' }}>
                          {story.replies || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Replies
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Metrics Overview Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Engagement Metrics Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Compare your key engagement metrics at a glance. This chart shows total engagement, 
              likes, comments, and views, helping you understand which metrics drive your content performance.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsOverview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metricsOverview.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Engagement Breakdown Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Engagement Distribution (Likes vs Comments)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              See the breakdown between likes and comments across all posts in the selected period. 
              A higher comment ratio indicates deeper audience engagement and conversation around your content.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Performance Radar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Performance Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This radar chart visualizes your performance across multiple dimensions. Areas closer 
              to the outer edge indicate stronger performance, while inner areas suggest opportunities 
              for improvement.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceMetrics}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="metric" stroke="#666" />
                <PolarRadiusAxis angle={90} domain={[0, 10]} stroke="#666" />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#667eea"
                  fill="#667eea"
                  fillOpacity={0.6}
                />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Daily Trend Area Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Day-of-Week Performance
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Analyze which days of the week generate the best engagement. This helps you identify optimal 
              posting days based on actual performance data from your posts during the selected period.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E4405F" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#E4405F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  stroke="#999"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#999" />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #ddd', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {payload[0].payload.day}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Posts: {payload[0].payload.posts}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ color: '#667eea' }}>
                            Engagement: {payload[0].value}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ color: '#E4405F' }}>
                            Reach: {payload[1]?.value || 0}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#667eea"
                  fillOpacity={1}
                  fill="url(#colorEngagement)"
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stroke="#E4405F"
                  fillOpacity={1}
                  fill="url(#colorReach)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Metrics Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Detailed Metrics Breakdown
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          This comprehensive table provides all key metrics at a glance. Use these numbers to track 
          progress, identify trends, and make data-driven decisions for your social media strategy.
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell>Current Followers</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                  {(organic?.followers || 0).toLocaleString()}
                </TableCell>
                <TableCell>Total number of accounts following your profile</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>Total Engagement</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#E4405F' }}>
                  {(organic?.total_engagement || 0).toLocaleString()}
                </TableCell>
                <TableCell>Sum of all interactions (likes, comments, shares, saves)</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>Engagement Rate</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#10b981' }}>
                  {engagementRate}%
                </TableCell>
                <TableCell>Percentage of Current Followers who engage with your content</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>Likes</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {(organic?.total_likes || 0).toLocaleString()}
                </TableCell>
                <TableCell>Total number of likes received on all posts</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>Comments</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {(organic?.total_comments || 0).toLocaleString()}
                </TableCell>
                <TableCell>Total number of comments on all posts</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>Avg. Engagement/Post</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                  {avgEngagementPerPost.toLocaleString()}
                </TableCell>
                <TableCell>Average engagement received per post</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Insights & Recommendations */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Key Insights & Recommendations
        </Typography>
        <Stack spacing={2}>
          <Alert severity="success">
            <AlertTitle sx={{ fontWeight: 'bold' }}>✅ Strengths</AlertTitle>
            Your engagement rate of {engagementRate}% {engagementRate >= 3 ? 'exceeds' : 'meets'} industry 
            benchmarks, indicating strong content resonance with your audience. Continue creating content 
            that drives this level of interaction.
          </Alert>
          
          {engagementBreakdown.length >= 2 && engagementBreakdown[1]?.percentage < 10 && (
            <Alert severity="warning">
              <AlertTitle sx={{ fontWeight: 'bold' }}>⚠️ Opportunity</AlertTitle>
              Comments represent only {engagementBreakdown[1]?.percentage || 0}% of total engagement. Consider 
              incorporating more conversation starters, questions, and calls-to-action in your captions 
              to encourage meaningful discussions.
            </Alert>
          )}
          
          <Alert severity="info">
            <AlertTitle sx={{ fontWeight: 'bold' }}>💡 Recommendation</AlertTitle>
            Based on your performance data, focus on content types that generate the highest engagement. 
            Analyze your top-performing posts to identify patterns in format, timing, and messaging that 
            resonate most with your audience.
          </Alert>
          
          {organic?.reach > 0 && organic?.followers > 0 && (
            <Alert severity="info">
              <AlertTitle sx={{ fontWeight: 'bold' }}>📊 Growth Strategy</AlertTitle>
              Your reach-to-follower ratio of {((organic.reach / organic.followers) * 100).toFixed(0)}% 
              suggests {(organic.reach / organic.followers) >= 1.5 ? 'excellent viral potential' : 'room for growth'}. 
              {(organic.reach / organic.followers) >= 1.5 
                ? ' Leverage this by encouraging shares and using relevant hashtags to expand your reach further.'
                : ' Increase reach by using strategic hashtags, posting at optimal times, and encouraging Current Followers to share your content.'}
            </Alert>
          )}
        </Stack>
      </Paper>
      </Box>
    </Box>
  );
};

export default ReportViewer;

