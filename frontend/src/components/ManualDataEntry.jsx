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
} from '@mui/material';

const ManualDataEntry = ({ open, onClose, onSubmit }) => {
  const [data, setData] = useState({
    platform: 'instagram',
    followers: '',
    impressions: '',
    reach: '',
    engagement: '',
    profile_views: '',
    website_clicks: '',
    posts_count: '',
    likes: '',
    comments: '',
    shares: '',
  });

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const handleSubmit = () => {
    // Convert to numbers
    const formattedData = {
      platform: 'instagram',
      platform_id: 'manual_entry',
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      data: JSON.stringify({
        organic: {
          followers: parseInt(data.followers) || 0,
          impressions: parseInt(data.impressions) || 0,
          reach: parseInt(data.reach) || 0,
          engagement: parseInt(data.engagement) || 0,
          profile_views: parseInt(data.profile_views) || 0,
          website_clicks: parseInt(data.website_clicks) || 0,
          posts_count: parseInt(data.posts_count) || 0,
          likes: parseInt(data.likes) || 0,
          comments: parseInt(data.comments) || 0,
          shares: parseInt(data.shares) || 0,
        },
        inorganic: {
          spend: 0,
          reach: 0,
          impressions: 0,
        }
      }),
      type: 'manual',
    };

    onSubmit(formattedData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">📊 Manual Instagram Data Entry</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your Instagram organic metrics from Instagram Insights
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Account Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Followers Count"
                type="number"
                value={data.followers}
                onChange={(e) => handleChange('followers', e.target.value)}
                helperText="Total Current Followers on your account"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Profile Views"
                type="number"
                value={data.profile_views}
                onChange={(e) => handleChange('profile_views', e.target.value)}
                helperText="Profile visits (last 30 days)"
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }} color="primary">
            Reach & Impressions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Impressions"
                type="number"
                value={data.impressions}
                onChange={(e) => handleChange('impressions', e.target.value)}
                helperText="Total times posts were seen"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reach"
                type="number"
                value={data.reach}
                onChange={(e) => handleChange('reach', e.target.value)}
                helperText="Unique accounts reached"
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }} color="primary">
            Engagement
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Likes"
                type="number"
                value={data.likes}
                onChange={(e) => handleChange('likes', e.target.value)}
                helperText="Total likes on posts"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Comments"
                type="number"
                value={data.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
                helperText="Total comments on posts"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Shares"
                type="number"
                value={data.shares}
                onChange={(e) => handleChange('shares', e.target.value)}
                helperText="Times posts were shared"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Posts Count"
                type="number"
                value={data.posts_count}
                onChange={(e) => handleChange('posts_count', e.target.value)}
                helperText="Number of posts published"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website Clicks"
                type="number"
                value={data.website_clicks}
                onChange={(e) => handleChange('website_clicks', e.target.value)}
                helperText="Clicks to your website/link"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2">
              💡 <strong>Where to find these numbers:</strong>
              <br />
              1. Open Instagram app
              <br />
              2. Go to your Profile → Professional dashboard
              <br />
              3. View Insights (last 30 days)
              <br />
              4. Copy the numbers and enter them here
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save Data & View Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualDataEntry;

