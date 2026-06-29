import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { Add, Delete, Edit, Instagram, Facebook, Campaign, CheckCircle, Cancel, InfoOutlined, VpnKey } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import FacebookOAuthLogin from './FacebookOAuthLogin';
import SystemTokenManager from './SystemTokenManager';

const UnifiedAccountManager = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Organic accounts state
  const [organicAccounts, setOrganicAccounts] = useState([]);
  const [editingOrganicId, setEditingOrganicId] = useState(null);
  const [organicFormData, setOrganicFormData] = useState({
    platform: '',
    account_name: '',
    account_id: '',
    access_token: '',
  });

  // Ad accounts state
  const [adAccounts, setAdAccounts] = useState([]);
  const [editingAdId, setEditingAdId] = useState(null);
  const [adFormData, setAdFormData] = useState({
    client_name: '',
    ad_account_id: '',
    access_token: '',
    currency: 'INR',
    account_name: '',
  });
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  const [systemTokenDialogOpen, setSystemTokenDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOrganicAccounts();
      fetchAdAccounts();
    }
  }, [open]);

  // Organic Accounts Functions
  const fetchOrganicAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/accounts.php`);
      if (response.data.success) {
        setOrganicAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching organic accounts:', error);
      // Don't show alert on fetch errors to avoid spam, but log it
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        console.warn('Backend server may not be running. Start it with: cd backend && php -S localhost:8080 router.php');
      }
    }
  };

  const handleAddOrganic = async () => {
    try {
      let response;
      if (editingOrganicId) {
        response = await axios.put(`${API_BASE_URL}/api/accounts.php?id=${editingOrganicId}`, organicFormData);
      } else {
        response = await axios.post(`${API_BASE_URL}/api/accounts.php`, organicFormData);
      }

      // Check if the response indicates success
      if (response.data && response.data.success) {
        setEditingOrganicId(null);
        alert('✅ Account ' + (editingOrganicId ? 'updated' : 'added') + ' successfully!');
        fetchOrganicAccounts();
        setOrganicFormData({ platform: '', account_name: '', account_id: '', access_token: '' });
      } else {
        // Backend returned an error response
        const errorMsg = response.data?.error || 'Failed to save account';
        console.error('Backend error:', errorMsg);
        alert('❌ Error: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error saving organic account:', error);
      let errorMsg = 'Failed to save account';

      // Check for network/connection errors
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMsg = 'Cannot connect to backend server. Please make sure the PHP server is running on port 8080.\n\nTo start it, run:\ncd backend\nphp -S localhost:8080 router.php';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      alert('❌ Error: ' + errorMsg);
    }
  };

  const handleEditOrganic = (account) => {
    setEditingOrganicId(account.id);
    setOrganicFormData({
      platform: account.platform,
      account_name: account.account_name,
      account_id: account.account_id,
      access_token: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteOrganic = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/accounts.php?id=${id}`);
        alert('✅ Account deleted!');
        fetchOrganicAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
      }
    }
  };

  // Ad Accounts Functions
  const fetchAdAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ad_accounts.php`);
      if (response.data.success) {
        setAdAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      // Don't show alert on fetch errors to avoid spam, but log it
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        console.warn('Backend server may not be running. Start it with: cd backend && php -S localhost:8080 router.php');
      }
    }
  };

  const handleAddAd = async () => {
    try {
      if (editingAdId) {
        await axios.put(`${API_BASE_URL}/api/ad_accounts.php?id=${editingAdId}`, adFormData);
        setEditingAdId(null);
        alert('✅ Ad account updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/ad_accounts.php`, adFormData);
        alert('✅ Ad account added successfully!');
      }
      fetchAdAccounts();
      setAdFormData({ client_name: '', ad_account_id: '', access_token: '', currency: 'INR', account_name: '' });
    } catch (error) {
      console.error('Error saving ad account:', error);
      let errorMsg = 'Failed to save ad account';

      // Check for network/connection errors
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMsg = 'Cannot connect to backend server. Please make sure the PHP server is running on port 8080.\n\nTo start it, run:\ncd backend\nphp -S localhost:8080 router.php';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      alert('❌ Error: ' + errorMsg);
    }
  };

  const handleEditAd = (account) => {
    setEditingAdId(account.id);
    setAdFormData({
      client_name: account.client_name,
      ad_account_id: account.ad_account_id,
      access_token: '',
      currency: account.currency,
      account_name: account.account_name || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAd = async (id) => {
    if (window.confirm('Are you sure you want to delete this ad account?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/ad_accounts.php?id=${id}`);
        alert('✅ Ad account deleted!');
        fetchAdAccounts();
      } catch (error) {
        console.error('Error deleting ad account:', error);
        alert('Failed to delete ad account');
      }
    }
  };

  const handleClose = () => {
    onClose();
    setEditingOrganicId(null);
    setEditingAdId(null);
    setOrganicFormData({ platform: '', account_name: '', account_id: '', access_token: '' });
    setAdFormData({ client_name: '', ad_account_id: '', access_token: '', currency: 'INR', account_name: '' });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Manage All Accounts</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organic (Instagram/Facebook) and ad accounts in one place
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Instagram fontSize="small" />
                Organic Accounts
                <Chip label={organicAccounts.length} size="small" color="primary" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Campaign fontSize="small" />
                Ad Accounts
                <Chip label={adAccounts.length} size="small" color="secondary" />
              </Box>
            }
          />
        </Tabs>

        {/* Organic Accounts Tab */}
        {activeTab === 0 && (
          <Box>
            {/* Add/Edit Organic Form */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Typography variant="h6">
                  {editingOrganicId ? '✏️ Edit Account' : '➕ Add Organic Account'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Facebook />}
                    onClick={() => setOauthDialogOpen(true)}
                  >
                    Connect via Facebook Login
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<VpnKey />}
                    onClick={() => setSystemTokenDialogOpen(true)}
                  >
                    Use Single Token
                  </Button>
                  {editingOrganicId && (
                    <Button size="small" onClick={() => {
                      setEditingOrganicId(null);
                      setOrganicFormData({ platform: '', account_name: '', account_id: '', access_token: '' });
                    }}>
                      Cancel Edit
                    </Button>
                  )}
                </Box>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={organicFormData.platform}
                  onChange={(e) => setOrganicFormData({ ...organicFormData, platform: e.target.value })}
                  label="Platform"
                >
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Account Name"
                value={organicFormData.account_name}
                onChange={(e) => setOrganicFormData({ ...organicFormData, account_name: e.target.value })}
                helperText="e.g., OTC Kompally - Instagram"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Platform ID"
                value={organicFormData.account_id}
                onChange={(e) => setOrganicFormData({ ...organicFormData, account_id: e.target.value })}
                helperText="Instagram: 17-digit ID, Facebook: Page ID"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={organicFormData.access_token}
                onChange={(e) => setOrganicFormData({ ...organicFormData, access_token: e.target.value })}
                helperText={editingOrganicId ? 'Leave blank to keep existing token' : 'Page access token'}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={editingOrganicId ? <Edit /> : <Add />}
                onClick={handleAddOrganic}
                disabled={!organicFormData.account_name || !organicFormData.account_id}
              >
                {editingOrganicId ? 'Update Account' : 'Add Account'}
              </Button>
            </Box>

            {/* Organic Accounts List */}
            <Typography variant="h6" gutterBottom>Connected Accounts ({organicAccounts.length})</Typography>
            {organicAccounts.map((account) => (
              <Box
                key={account.id}
                sx={{
                  p: 2,
                  mb: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {account.platform === 'instagram' ? (
                    <Instagram color="error" sx={{ fontSize: 40 }} />
                  ) : (
                    <Facebook color="primary" sx={{ fontSize: 40 }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {account.account_name}
                      </Typography>
                      <Chip
                        icon={account.status === 'active' ? <CheckCircle sx={{ fontSize: 16 }} /> : <Cancel sx={{ fontSize: 16 }} />}
                        label={account.status === 'active' ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: account.status === 'active' ? '#10b98115' : '#ef444415',
                          color: account.status === 'active' ? '#10b981' : '#ef4444',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {account.platform.toUpperCase()} • {account.account_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Added: {new Date(account.created_at).toLocaleDateString()}
                    </Typography>
                    {account.owner_name && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', mt: 0.5, fontWeight: 500 }}>
                        👤 Added by: {account.owner_name}
                      </Typography>
                    )}
                    {account.status === 'inactive' && (
                      <Box sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: '#fee',
                        borderRadius: 1,
                        border: '1px solid #ef4444'
                      }}>
                        <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', mb: 0.5 }}>
                          <strong>⚠️ Account Inactive</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block', lineHeight: 1.4 }}>
                          <strong>Reason:</strong> {account.inactive_reason || 'Token expired or invalid permissions'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                          <strong>Action:</strong> Update the access token above to reactivate this account
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton color="primary" onClick={() => handleEditOrganic(account)} title="Edit">
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteOrganic(account.id)} title="Delete">
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            ))}
            {organicAccounts.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No organic accounts yet. Add Instagram or Facebook pages above!
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Ad Accounts Tab */}
        {activeTab === 1 && (
          <Box>
            {/* Add/Edit Ad Form */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {editingAdId ? '✏️ Edit Ad Account' : '➕ Add Ad Account'}
                </Typography>
                {editingAdId && (
                  <Button size="small" onClick={() => {
                    setEditingAdId(null);
                    setAdFormData({ client_name: '', ad_account_id: '', access_token: '', currency: 'INR', account_name: '' });
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </Box>

              <TextField
                fullWidth
                label="Client Name"
                value={adFormData.client_name}
                onChange={(e) => setAdFormData({ ...adFormData, client_name: e.target.value })}
                helperText="e.g., OTC Kompally, Armario Pro"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Ad Account ID"
                value={adFormData.ad_account_id}
                onChange={(e) => setAdFormData({ ...adFormData, ad_account_id: e.target.value })}
                helperText="Numbers only, without 'act_' prefix"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Account Name (Optional)"
                value={adFormData.account_name}
                onChange={(e) => setAdFormData({ ...adFormData, account_name: e.target.value })}
                helperText="Friendly name from Facebook"
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={adFormData.currency}
                  onChange={(e) => setAdFormData({ ...adFormData, currency: e.target.value })}
                  label="Currency"
                >
                  <MenuItem value="INR">INR (₹) - Indian Rupees</MenuItem>
                  <MenuItem value="USD">USD ($) - US Dollars</MenuItem>
                  <MenuItem value="EUR">EUR (€) - Euros</MenuItem>
                  <MenuItem value="GBP">GBP (£) - British Pounds</MenuItem>
                  <MenuItem value="AUD">AUD (A$) - Australian Dollars</MenuItem>
                  <MenuItem value="CAD">CAD (CA$) - Canadian Dollars</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={adFormData.access_token}
                onChange={(e) => setAdFormData({ ...adFormData, access_token: e.target.value })}
                helperText={editingAdId ? 'Leave blank to keep existing token' : 'Ads API token with ads_read permission'}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={editingAdId ? <Edit /> : <Add />}
                onClick={handleAddAd}
                disabled={!adFormData.client_name || !adFormData.ad_account_id || (!editingAdId && !adFormData.access_token)}
                color="secondary"
              >
                {editingAdId ? 'Update Ad Account' : 'Add Ad Account'}
              </Button>
            </Box>

            {/* Ad Accounts List */}
            <Typography variant="h6" gutterBottom>Connected Ad Accounts ({adAccounts.length})</Typography>
            {adAccounts.map((account) => (
              <Box
                key={account.id}
                sx={{
                  p: 2,
                  mb: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Campaign color="secondary" sx={{ fontSize: 40 }} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {account.client_name}
                      </Typography>
                      <Chip
                        icon={account.status === 'active' ? <CheckCircle sx={{ fontSize: 16 }} /> : <Cancel sx={{ fontSize: 16 }} />}
                        label={account.status === 'active' ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: account.status === 'active' ? '#10b98115' : '#ef444415',
                          color: account.status === 'active' ? '#10b981' : '#ef4444',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Ad Account: {account.ad_account_id}
                    </Typography>
                    {account.account_name && (
                      <Typography variant="body2" color="text.secondary">
                        {account.account_name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="secondary">
                      Currency: {account.currency}
                    </Typography>
                    {account.owner_name && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'secondary.main', mt: 0.5, fontWeight: 500 }}>
                        👤 Added by: {account.owner_name}
                      </Typography>
                    )}
                    {account.status === 'inactive' && (
                      <Box sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: '#fee',
                        borderRadius: 1,
                        border: '1px solid #ef4444'
                      }}>
                        <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', mb: 0.5 }}>
                          <strong>⚠️ Account Inactive</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block', lineHeight: 1.4 }}>
                          <strong>Reason:</strong> {account.inactive_reason || 'Token expired or invalid permissions'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                          <strong>Action:</strong> Update the access token above to reactivate this account
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton color="primary" onClick={() => handleEditAd(account)} title="Edit">
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteAd(account.id)} title="Delete">
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            ))}
            {adAccounts.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No ad accounts yet. Add campaign ad accounts above!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
      <FacebookOAuthLogin
        open={oauthDialogOpen}
        onClose={() => setOauthDialogOpen(false)}
        type="organic"
        onSuccess={(connectedAccounts = []) => {
          fetchOrganicAccounts();
          if (connectedAccounts.length) {
            alert(`✅ Connected ${connectedAccounts.length} account(s) successfully`);
          }
          setOauthDialogOpen(false);
        }}
      />

      <SystemTokenManager
        open={systemTokenDialogOpen}
        onClose={() => setSystemTokenDialogOpen(false)}
        onAccountsConnected={(connectedAccounts = []) => {
          fetchOrganicAccounts();
          fetchAdAccounts();
          if (connectedAccounts.length) {
            alert(`✅ Connected ${connectedAccounts.length} account(s) successfully`);
          }
          setSystemTokenDialogOpen(false);
        }}
      />
    </Dialog>
  );
};

export default UnifiedAccountManager;

