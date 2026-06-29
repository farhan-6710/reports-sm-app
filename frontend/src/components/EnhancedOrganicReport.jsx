import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Paper,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Instagram,
  Facebook,
  TrendingUp,
  Visibility,
  ThumbUp,
  Link as LinkIcon,
  Close,
  ArrowForward,
  ArrowBack,
  CheckCircle,
  Info,
  People,
  BarChart,
  ShowChart,
  Chat,
} from '@mui/icons-material';

const EnhancedOrganicReport = ({ open, onClose, onSubmit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [platform, setPlatform] = useState('instagram');
  const [accountName, setAccountName] = useState('');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  
  const [data, setData] = useState({
    // Account Stats
    followers: '',
    following: '',
    posts_count: '',
    
    // Reach & Impressions
    impressions: '',
    reach: '',
    profile_views: '',
    
    // Engagement
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    
    // Traffic
    website_clicks: '',
    email_clicks: '',
    
    // Stories
    story_views: '',
    story_replies: '',
    
    // Additional Metrics
    video_views: '',
    reel_plays: '',
    average_engagement_rate: '',
  });

  const steps = ['Platform & Account', 'Audience Metrics', 'Engagement Data', 'Review & Generate'];

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const calculateMetrics = () => {
    const total_engagement = (parseInt(data.likes) || 0) + 
                            (parseInt(data.comments) || 0) + 
                            (parseInt(data.shares) || 0) + 
                            (parseInt(data.saves) || 0);
    
    const engagement_rate = data.followers && total_engagement 
      ? ((total_engagement / parseInt(data.followers)) * 100).toFixed(2) 
      : 0;

    const avg_engagement_per_post = data.posts_count && total_engagement
      ? Math.round(total_engagement / parseInt(data.posts_count))
      : 0;

    return { total_engagement, engagement_rate, avg_engagement_per_post };
  };

  const handleSubmit = () => {
    const { total_engagement, engagement_rate, avg_engagement_per_post } = calculateMetrics();

    const reportData = {
      id: Date.now(),
      platform: platform,
      platform_id: 'manual_' + Date.now(),
      account_name: accountName || `${platform} Account`,
      start_date: new Date(Date.now() - (reportPeriod === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      type: 'organic',
      report_period: reportPeriod,
      data: JSON.stringify({
        organic: {
          // Account metrics
          followers: parseInt(data.followers) || 0,
          following: parseInt(data.following) || 0,
          posts: parseInt(data.posts_count) || 0,
          
          // Reach metrics
          impressions: parseInt(data.impressions) || 0,
          reach: parseInt(data.reach) || 0,
          profile_views: parseInt(data.profile_views) || 0,
          
          // Engagement metrics
          likes: parseInt(data.likes) || 0,
          comments: parseInt(data.comments) || 0,
          shares: parseInt(data.shares) || 0,
          saves: parseInt(data.saves) || 0,
          total_engagement: total_engagement,
          engagement_rate: parseFloat(engagement_rate),
          avg_engagement_per_post: avg_engagement_per_post,
          
          // Traffic metrics
          website_clicks: parseInt(data.website_clicks) || 0,
          email_clicks: parseInt(data.email_clicks) || 0,
          
          // Story metrics
          story_views: parseInt(data.story_views) || 0,
          story_replies: parseInt(data.story_replies) || 0,
          
          // Additional
          video_views: parseInt(data.video_views) || 0,
          reel_plays: parseInt(data.reel_plays) || 0,
        }
      }),
    };

    onSubmit(reportData);
    
    // Reset form
    setActiveStep(0);
    setData({
      followers: '', following: '', posts_count: '',
      impressions: '', reach: '', profile_views: '',
      likes: '', comments: '', shares: '', saves: '',
      website_clicks: '', email_clicks: '',
      story_views: '', story_replies: '',
      video_views: '', reel_plays: '', average_engagement_rate: '',
    });
    setAccountName('');
    
    onClose();
  };

  const getCompletionPercentage = () => {
    const fields = Object.values(data);
    const filled = fields.filter(val => val !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>📱 Quick Start Guide:</strong><br />
              Open your {platform === 'instagram' ? 'Instagram' : 'Facebook'} app → Go to Insights → Copy the numbers from the last {reportPeriod === 'weekly' ? '7 days' : '30 days'}
            </Alert>

            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Platform
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant={platform === 'instagram' ? 'contained' : 'outlined'}
                    onClick={() => setPlatform('instagram')}
                    startIcon={<Instagram />}
                    sx={{ 
                      flex: 1, 
                      py: 2,
                      bgcolor: platform === 'instagram' ? 'white' : 'transparent',
                      color: platform === 'instagram' ? '#667eea' : 'white',
                      '&:hover': { bgcolor: platform === 'instagram' ? 'white' : 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    Instagram
                  </Button>
                  <Button
                    variant={platform === 'facebook' ? 'contained' : 'outlined'}
                    onClick={() => setPlatform('facebook')}
                    startIcon={<Facebook />}
                    sx={{ 
                      flex: 1, 
                      py: 2,
                      bgcolor: platform === 'facebook' ? 'white' : 'transparent',
                      color: platform === 'facebook' ? '#667eea' : 'white',
                      '&:hover': { bgcolor: platform === 'facebook' ? 'white' : 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    Facebook
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Period
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Chip
                    label="Last 7 Days"
                    onClick={() => setReportPeriod('weekly')}
                    color={reportPeriod === 'weekly' ? 'primary' : 'default'}
                    sx={{ px: 3, py: 2, fontSize: '1rem' }}
                  />
                  <Chip
                    label="Last 30 Days"
                    onClick={() => setReportPeriod('monthly')}
                    color={reportPeriod === 'monthly' ? 'primary' : 'default'}
                    sx={{ px: 3, py: 2, fontSize: '1rem' }}
                  />
                </Box>
              </CardContent>
            </Card>

            <TextField
              fullWidth
              label="Account Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., @mybrand or My Business Page"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {platform === 'instagram' ? <Instagram color="error" /> : <Facebook color="primary" />}
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People /> Audience Overview
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Total Followers"
                  type="number"
                  value={data.followers}
                  onChange={(e) => handleChange('followers', e.target.value)}
                  helperText="Current follower count"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><People /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Following"
                  type="number"
                  value={data.following}
                  onChange={(e) => handleChange('following', e.target.value)}
                  helperText="Accounts you follow"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Posts Published"
                  type="number"
                  value={data.posts_count}
                  onChange={(e) => handleChange('posts_count', e.target.value)}
                  helperText={`Posts in last ${reportPeriod === 'weekly' ? '7' : '30'} days`}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 1 }} color="success.main">
              <Visibility /> Reach & Visibility
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Total Impressions"
                  type="number"
                  value={data.impressions}
                  onChange={(e) => handleChange('impressions', e.target.value)}
                  helperText="Times content was displayed"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><BarChart /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Accounts Reached"
                  type="number"
                  value={data.reach}
                  onChange={(e) => handleChange('reach', e.target.value)}
                  helperText="Unique accounts"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><ShowChart /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Profile Visits"
                  type="number"
                  value={data.profile_views}
                  onChange={(e) => handleChange('profile_views', e.target.value)}
                  helperText="Profile page views"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Visibility /></InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }} color="warning.main">
              <ThumbUp /> Engagement Metrics
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Likes"
                  type="number"
                  value={data.likes}
                  onChange={(e) => handleChange('likes', e.target.value)}
                  helperText="All likes on posts"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><ThumbUp /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Comments"
                  type="number"
                  value={data.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                  helperText="Comments received"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Chat /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Shares"
                  type="number"
                  value={data.shares}
                  onChange={(e) => handleChange('shares', e.target.value)}
                  helperText="Times content was shared"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Saves"
                  type="number"
                  value={data.saves}
                  onChange={(e) => handleChange('saves', e.target.value)}
                  helperText="Times content was saved"
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 1 }} color="info.main">
              <LinkIcon /> Traffic & Conversions
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website Clicks"
                  type="number"
                  value={data.website_clicks}
                  onChange={(e) => handleChange('website_clicks', e.target.value)}
                  helperText="Clicks to your website"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LinkIcon /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email/Contact Clicks"
                  type="number"
                  value={data.email_clicks}
                  onChange={(e) => handleChange('email_clicks', e.target.value)}
                  helperText="Contact button taps"
                />
              </Grid>
            </Grid>

            {platform === 'instagram' && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }} color="secondary.main">
                  📸 Stories & Reels
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Story Views"
                      type="number"
                      value={data.story_views}
                      onChange={(e) => handleChange('story_views', e.target.value)}
                      helperText="Total story impressions"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Story Replies"
                      type="number"
                      value={data.story_replies}
                      onChange={(e) => handleChange('story_replies', e.target.value)}
                      helperText="DMs from stories"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Video Views"
                      type="number"
                      value={data.video_views}
                      onChange={(e) => handleChange('video_views', e.target.value)}
                      helperText="Total video plays"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Reel Plays"
                      type="number"
                      value={data.reel_plays}
                      onChange={(e) => handleChange('reel_plays', e.target.value)}
                      helperText="Reel views"
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        );

      case 3:
        const metrics = calculateMetrics();
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              <strong>✅ Report Ready!</strong> Review your data below and click "Generate Report" to create your professional analytics report.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Engagement</Typography>
                    <Typography variant="h3">{metrics.total_engagement.toLocaleString()}</Typography>
                    <Typography variant="body2">Likes + Comments + Shares + Saves</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Engagement Rate</Typography>
                    <Typography variant="h3">{metrics.engagement_rate}%</Typography>
                    <Typography variant="body2">Engagement / Current Followers × 100</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Avg per Post</Typography>
                    <Typography variant="h3">{metrics.avg_engagement_per_post}</Typography>
                    <Typography variant="body2">Average engagement per post</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Current Followers</Typography>
                  <Typography variant="h6">{parseInt(data.followers || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Impressions</Typography>
                  <Typography variant="h6">{parseInt(data.impressions || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Reach</Typography>
                  <Typography variant="h6">{parseInt(data.reach || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Profile Views</Typography>
                  <Typography variant="h6">{parseInt(data.profile_views || 0).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completion Status
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={getCompletionPercentage()} 
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {getCompletionPercentage()}% complete ({Object.values(data).filter(v => v !== '').length} of {Object.keys(data).length} fields filled)
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">✨ Create Professional Organic Report</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          Back
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={!data.followers}
              startIcon={<CheckCircle />}
              sx={{ px: 4 }}
            >
              Generate Report 📊
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              sx={{ px: 4 }}
            >
              Next
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedOrganicReport;

