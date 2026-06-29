import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  ThumbUp,
  Visibility,
  AttachMoney,
  Instagram,
  Facebook,
  Campaign as CampaignIcon,
  MoreVert,
  Refresh,
  Download,
  CalendarToday,
  Speed,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { reportsAPI, accountsAPI } from '../services/api';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import MetricCard from './MetricCard';

const OverviewDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7days');
  const [channel, setChannel] = useState('organic'); // 'organic' | 'paid'
  const [accounts, setAccounts] = useState([]);
  const [reports, setReports] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  
  // Mock data for demonstration - replace with real API calls
  const [dashboardData, setDashboardData] = useState({
    totalClients: 0,
    // Organic rollups
    totalFollowers: 0,
    totalEngagement: 0,
    totalReach: 0,
    totalImpressions: 0,
    avgEngagementRate: 0,
    // Paid rollups (inorganic)
    totalPaidSpend: 0,
    totalPaidReach: 0,
    totalPaidImpressions: 0,
    totalPaidEngagements: 0,
    topPerformingClient: null,
    recentActivity: [],
  });

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch accounts
      const accountsRes = await accountsAPI.getAll();
      const accountsList = accountsRes.data.data || [];
      setAccounts(accountsList);

      // Fetch reports
      const reportsRes = await reportsAPI.getAll();
      const reportsList = reportsRes.data.data || [];
      setReports(reportsList);

      // Fetch ad accounts
      const adAccountsRes = await axios.get(`${API_BASE_URL}/api/ad_accounts.php`);
      const adAccountsList = adAccountsRes.data.data || [];
      setAdAccounts(adAccountsList);

      // Calculate dashboard metrics
      calculateMetrics(accountsList, reportsList, adAccountsList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (accountsList, reportsList, adAccountsList) => {
    // Calculate totals from the most recent report per account to avoid double-counting
    const latestReportByPlatformId = new Map();
    reportsList.forEach((report) => {
      const existing = latestReportByPlatformId.get(report.platform_id);
      if (!existing) {
        latestReportByPlatformId.set(report.platform_id, report);
        return;
      }
      const existingTime = new Date(existing.created_at).getTime();
      const reportTime = new Date(report.created_at).getTime();
      if (reportTime > existingTime) latestReportByPlatformId.set(report.platform_id, report);
    });

    let totalFollowers = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    let totalPaidSpend = 0;
    let totalPaidReach = 0;
    let totalPaidImpressions = 0;
    let totalPaidEngagements = 0;

    [...latestReportByPlatformId.values()].forEach(report => {
      try {
        const data = JSON.parse(report.data);
        if (data.organic) {
          totalFollowers += data.organic.followers || 0;
          totalEngagement += data.organic.total_engagement || data.organic.engagement || 0;
          totalReach += data.organic.reach || 0;
          totalImpressions += data.organic.impressions || 0;
        }
        if (data.inorganic) {
          totalPaidSpend += data.inorganic.spend || 0;
          totalPaidReach += data.inorganic.reach || 0;
          totalPaidImpressions += data.inorganic.impressions || 0;
          totalPaidEngagements += data.inorganic.engagements || data.inorganic.engagement || 0;
        }
      } catch (e) {
        console.error('Error parsing report data:', e);
      }
    });

    setDashboardData({
      totalClients: accountsList.length,
      totalFollowers,
      totalEngagement,
      totalReach,
      totalImpressions,
      avgEngagementRate: totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0,
      totalPaidSpend,
      totalPaidReach,
      totalPaidImpressions,
      totalPaidEngagements,
      topPerformingClient: accountsList[0] || null,
      recentActivity: reportsList.slice(0, 5),
    });
  };

  // Sample data for charts
  const weeklyPerformance = [
    { day: 'Mon', engagement: 450, reach: 2400, followers: 120 },
    { day: 'Tue', engagement: 520, reach: 2800, followers: 145 },
    { day: 'Wed', engagement: 480, reach: 2600, followers: 132 },
    { day: 'Thu', engagement: 610, reach: 3200, followers: 178 },
    { day: 'Fri', engagement: 580, reach: 3100, followers: 165 },
    { day: 'Sat', engagement: 720, reach: 3800, followers: 210 },
    { day: 'Sun', engagement: 690, reach: 3600, followers: 195 },
  ];

  const platformDistribution = [
    { name: 'Instagram', value: 45, color: '#E4405F' },
    { name: 'Facebook', value: 35, color: '#1877F2' },
    { name: 'Campaigns', value: 20, color: '#667eea' },
  ];

  const latestReportByPlatformId = React.useMemo(() => {
    const map = new Map();
    reports.forEach((report) => {
      const existing = map.get(report.platform_id);
      if (!existing) {
        map.set(report.platform_id, report);
        return;
      }
      const existingTime = new Date(existing.created_at).getTime();
      const reportTime = new Date(report.created_at).getTime();
      if (reportTime > existingTime) map.set(report.platform_id, report);
    });
    return map;
  }, [reports]);

  const clientPerformance = React.useMemo(() => {
    const rows = accounts.map((account) => {
      const report = latestReportByPlatformId.get(account.account_id);
      let organic = {};
      let inorganic = {};
      if (report?.data) {
        try {
          const parsed = JSON.parse(report.data);
          organic = parsed.organic || {};
          inorganic = parsed.inorganic || {};
        } catch (e) {
          // noop; keep empty
        }
      }

      const orgEngagement = organic.total_engagement ?? organic.engagement ?? 0;
      const orgReach = organic.reach ?? 0;
      const orgImpressions = organic.impressions ?? 0;
      const orgFollowers = organic.followers ?? 0;
      const orgEngagementRate = organic.engagement_rate ?? (orgReach > 0 ? (orgEngagement / orgReach) * 100 : 0);

      const paidSpend = inorganic.spend ?? 0;
      const paidReach = inorganic.reach ?? 0;
      const paidImpressions = inorganic.impressions ?? 0;
      const paidEngagements = inorganic.engagements ?? inorganic.engagement ?? 0;

      return {
        id: account.id,
        name: account.account_name,
        platform: account.platform,
        // Organic
        followers: orgFollowers,
        engagement: orgEngagement,
        reach: orgReach,
        impressions: orgImpressions,
        engagementRate: orgEngagementRate,
        // Paid
        spend: paidSpend,
        paidReach,
        paidImpressions,
        paidEngagements,
        // For now we don’t have consistent WoW/MoM growth per account here
        growth: null,
      };
    });

    // Sort by the primary KPI for the selected channel
    rows.sort((a, b) => {
      if (channel === 'paid') return (b.spend || 0) - (a.spend || 0);
      return (b.engagement || 0) - (a.engagement || 0);
    });
    return rows.slice(0, 10);
  }, [accounts, latestReportByPlatformId, channel]);

  const StatCard = ({ title, value, change, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {change >= 0 ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: change >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}
                >
                  {Math.abs(change)}% vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}15`,
              color: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'instagram': return <Instagram sx={{ fontSize: 18 }} />;
      case 'facebook': return <Facebook sx={{ fontSize: 18 }} />;
      default: return <CampaignIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'instagram': return '#E4405F';
      case 'facebook': return '#1877F2';
      default: return '#667eea';
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor all your clients' performance in one place
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              label="Channel"
            >
              <MenuItem value="organic">Organic</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAllData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            value={dashboardData.totalClients.toString()}
            label="Total Clients"
            trend={12.5}
            showSparkline={false}
            color="#667eea"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            value={
              channel === 'paid'
                ? ('₹' + dashboardData.totalPaidSpend.toLocaleString())
                : dashboardData.totalFollowers.toLocaleString()
            }
            label={channel === 'paid' ? 'Paid Spend (Total)' : 'Total Followers'}
            trend={8.3}
            showSparkline={true}
            color={channel === 'paid' ? '#10b981' : '#E4405F'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            value={
              channel === 'paid'
                ? dashboardData.totalPaidImpressions.toLocaleString()
                : dashboardData.totalEngagement.toLocaleString()
            }
            label={channel === 'paid' ? 'Paid Impressions' : 'Total Engagement'}
            trend={15.7}
            showSparkline={false}
            color={channel === 'paid' ? '#667eea' : '#1877F2'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            value={
              channel === 'paid'
                ? dashboardData.totalPaidReach.toLocaleString()
                : `${dashboardData.avgEngagementRate}%`
            }
            label={channel === 'paid' ? 'Paid Reach' : 'Avg Engagement Rate'}
            trend={-3.2}
            showProgress={channel === 'paid'}
            progressValue={channel === 'paid' ? 75 : 0}
            color={channel === 'paid' ? '#10b981' : '#764ba2'}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Weekly Performance Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Weekly Performance Trend
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="Engagement" size="small" sx={{ bgcolor: '#667eea15', color: '#667eea' }} />
                <Chip label="Reach" size="small" sx={{ bgcolor: '#E4405F15', color: '#E4405F' }} />
                <Chip label="Current Followers" size="small" sx={{ bgcolor: '#10b98115', color: '#10b981' }} />
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyPerformance}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E4405F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E4405F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip />
                <Area type="monotone" dataKey="engagement" stroke="#667eea" fillOpacity={1} fill="url(#colorEngagement)" />
                <Area type="monotone" dataKey="reach" stroke="#E4405F" fillOpacity={1} fill="url(#colorReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Platform Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Platform Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={platformDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {platformDistribution.map((platform, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: platform.color }} />
                    <Typography variant="body2">{platform.name}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {platform.value}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Client Performance Table & Recent Activity */}
      <Grid container spacing={3}>
        {/* Top Performing Clients */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Client Performance
              </Typography>
              <Button size="small" endIcon={<Speed />}>
                View All
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Platform</TableCell>
                    {channel === 'paid' ? (
                      <>
                        <TableCell align="right">Spend</TableCell>
                        <TableCell align="right">Impressions</TableCell>
                        <TableCell align="right">Reach</TableCell>
                        <TableCell align="right">Engagements</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right">Engagement</TableCell>
                        <TableCell align="right">Reach</TableCell>
                        <TableCell align="right">Impressions</TableCell>
                        <TableCell align="right">Eng. Rate</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientPerformance.map((client, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: getPlatformColor(client.platform) }}>
                            {client.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {client.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getPlatformIcon(client.platform)}
                          label={client.platform}
                          size="small"
                          sx={{ 
                            bgcolor: `${getPlatformColor(client.platform)}15`,
                            color: getPlatformColor(client.platform),
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      {channel === 'paid' ? (
                        <>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {'₹' + (client.spend || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(client.paidImpressions || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(client.paidReach || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(client.paidEngagements || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {(client.engagement || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(client.reach || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(client.impressions || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${Number(client.engagementRate || 0).toFixed(2)}%`}
                              size="small"
                              sx={{
                                bgcolor: '#667eea15',
                                color: '#667eea',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Recent Activity
              </Typography>
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              {dashboardData.recentActivity.map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    bgcolor: '#f9fafb',
                    borderRadius: 2,
                    borderLeft: `4px solid ${getPlatformColor(activity.platform)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(activity.platform)}
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        {activity.platform}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Report generated: {activity.start_date} to {activity.end_date}
                  </Typography>
                </Box>
              ))}
              {dashboardData.recentActivity.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No recent activity
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Instagram />}
              sx={{ py: 1.5, borderColor: '#E4405F', color: '#E4405F', '&:hover': { borderColor: '#E4405F', bgcolor: '#E4405F15' } }}
            >
              Generate Instagram Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Facebook />}
              sx={{ py: 1.5, borderColor: '#1877F2', color: '#1877F2', '&:hover': { borderColor: '#1877F2', bgcolor: '#1877F215' } }}
            >
              Generate Facebook Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CampaignIcon />}
              sx={{ py: 1.5, borderColor: '#667eea', color: '#667eea', '&:hover': { borderColor: '#667eea', bgcolor: '#667eea15' } }}
            >
              View Campaign Analytics
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Download />}
              sx={{ py: 1.5 }}
            >
              Export All Data
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default OverviewDashboard;

