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
  Divider,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import { Instagram, Facebook, TrendingUp, Visibility, ThumbUp, Link as LinkIcon } from '@mui/icons-material';

const OrganicReportForm = ({ open, onClose, onSubmit }) => {
  const [platform, setPlatform] = useState('instagram');
  const [accountName, setAccountName] = useState('');
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
    
    // Stories (if applicable)
    story_views: '',
    story_replies: '',
  });

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const handleSubmit = () => {
    const total_engagement = (parseInt(data.likes) || 0) + 
                            (parseInt(data.comments) || 0) + 
                            (parseInt(data.shares) || 0) + 
                            (parseInt(data.saves) || 0);
    
    const engagement_rate = data.followers && total_engagement 
      ? ((total_engagement / parseInt(data.followers)) * 100).toFixed(2) 
      : 0;

    const reportData = {
      id: Date.now(),
      platform: platform,
      platform_id: 'manual_' + Date.now(),
      account_name: accountName || `${platform} Account`,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      type: 'organic',
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
          
          // Traffic metrics
          website_clicks: parseInt(data.website_clicks) || 0,
          email_clicks: parseInt(data.email_clicks) || 0,
          
          // Story metrics
          story_views: parseInt(data.story_views) || 0,
          story_replies: parseInt(data.story_replies) || 0,
        }
      }),
    };

    onSubmit(reportData);
    
    // Reset form
    setData({
      followers: '',
      following: '',
      posts_count: '',
      impressions: '',
      reach: '',
      profile_views: '',
      likes: '',
      comments: '',
      shares: '',
      saves: '',
      website_clicks: '',
      email_clicks: '',
      story_views: '',
      story_replies: '',
    });
    setAccountName('');
    
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {platform === 'instagram' ? <Instagram fontSize="large" color="error" /> : <Facebook fontSize="large" color="primary" />}
          <Box>
            <Typography variant="h5">Create Organic Report</Typography>
            <Typography variant="body2" color="text.secondary">
              No ads, no API - Just your organic performance metrics
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>📱 Where to find these numbers:</strong><br />
          Open {platform === 'instagram' ? 'Instagram' : 'Facebook'} app → Your Profile → Professional Dashboard → Insights (Last 30 days)
        </Alert>

        {/* Platform Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Select Platform</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              icon={<Instagram />}
              label="Instagram"
              onClick={() => setPlatform('instagram')}
              color={platform === 'instagram' ? 'error' : 'default'}
              variant={platform === 'instagram' ? 'filled' : 'outlined'}
              sx={{ px: 2, py: 3 }}
            />
            <Chip
              icon={<Facebook />}
              label="Facebook"
              onClick={() => setPlatform('facebook')}
              color={platform === 'facebook' ? 'primary' : 'default'}
              variant={platform === 'facebook' ? 'filled' : 'outlined'}
              sx={{ px: 2, py: 3 }}
            />
          </Box>
        </Box>

        {/* Account Name */}
        <TextField
          fullWidth
          label="Account Name (Optional)"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g., My Brand Account"
          sx={{ mb: 3 }}
        />

        <Divider sx={{ mb: 3 }} />

        {/* Account Statistics */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
          <Typography variant="h6" gutterBottom>📊 Account Stats</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Followers"
                type="number"
                value={data.followers}
                onChange={(e) => handleChange('followers', e.target.value)}
                helperText="Your follower count"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Posts Published"
                type="number"
                value={data.posts_count}
                onChange={(e) => handleChange('posts_count', e.target.value)}
                helperText="Posts in last 30 days"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Reach & Visibility */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'white' }}>
          <Typography variant="h6" gutterBottom>👁️ Reach & Visibility</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Impressions"
                type="number"
                value={data.impressions}
                onChange={(e) => handleChange('impressions', e.target.value)}
                helperText="Times content was shown"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Engagement */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', color: 'white' }}>
          <Typography variant="h6" gutterBottom>💬 Engagement</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Likes"
                type="number"
                value={data.likes}
                onChange={(e) => handleChange('likes', e.target.value)}
                helperText="Likes on all posts"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Traffic & Conversions */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
          <Typography variant="h6" gutterBottom>🔗 Traffic & Actions</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website Clicks"
                type="number"
                value={data.website_clicks}
                onChange={(e) => handleChange('website_clicks', e.target.value)}
                helperText="Link clicks to website"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                sx={{ bgcolor: 'white', borderRadius: 1 }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Stories */}
        {platform === 'instagram' && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'secondary.light', color: 'white' }}>
            <Typography variant="h6" gutterBottom>📸 Stories</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Story Views"
                  type="number"
                  value={data.story_views}
                  onChange={(e) => handleChange('story_views', e.target.value)}
                  helperText="Total story impressions"
                  sx={{ bgcolor: 'white', borderRadius: 1 }}
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
                  sx={{ bgcolor: 'white', borderRadius: 1 }}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} size="large">
          Cancel
        </Button>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleSubmit}
          disabled={!data.followers}
        >
          Generate Organic Report 📊
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrganicReportForm;

