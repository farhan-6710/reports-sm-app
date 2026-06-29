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
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const AdAccountManager = ({ open, onClose }) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    ad_account_id: '',
    access_token: '',
    currency: 'INR',
    account_name: '',
  });

  useEffect(() => {
    if (open) {
      fetchAdAccounts();
    }
  }, [open]);

  const fetchAdAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ad_accounts.php`);
      if (response.data.success) {
        setAdAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const handleAdd = async () => {
    try {
      let response;
      if (editingId) {
        response = await axios.put(`${API_BASE_URL}/api/ad_accounts.php?id=${editingId}`, formData);
        setEditingId(null);
        if (response.data && response.data.success) {
          alert('✅ Ad account updated successfully!');
        } else {
          throw new Error(response.data?.error || 'Update failed');
        }
      } else {
        response = await axios.post(`${API_BASE_URL}/api/ad_accounts.php`, formData);
        if (response.data && response.data.success) {
          alert('✅ Ad account added successfully!');
        } else {
          throw new Error(response.data?.error || 'Add failed');
        }
      }
      fetchAdAccounts();
      setFormData({
        client_name: '',
        ad_account_id: '',
        access_token: '',
        currency: 'INR',
        account_name: '',
      });
    } catch (error) {
      console.error('Error saving ad account:', error);
      let errorMsg = 'Failed to save ad account';
      
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        errorMsg = 'Cannot connect to backend server. Please make sure the PHP server is running on port 8080.\n\nTo start it, run:\ncd backend\nphp -S localhost:8080 router.php';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert('❌ Error: ' + errorMsg);
      if (!editingId) {
        setFormData({
          client_name: '',
          ad_account_id: '',
          access_token: '',
          currency: 'INR',
          account_name: '',
        });
      }
    }
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      client_name: account.client_name,
      ad_account_id: account.ad_account_id,
      access_token: '',
      currency: account.currency,
      account_name: account.account_name || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      client_name: '',
      ad_account_id: '',
      access_token: '',
      currency: 'INR',
      account_name: '',
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ad account?')) {
      try {
        const response = await axios.delete(`${API_BASE_URL}/api/ad_accounts.php?id=${id}`);
        if (response.data && response.data.success) {
          alert('✅ Ad account deleted!');
        } else {
          throw new Error(response.data?.error || 'Delete failed');
        }
        fetchAdAccounts();
      } catch (error) {
        console.error('Error deleting ad account:', error);
        alert('Failed to delete ad account');
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Ad Accounts</DialogTitle>
      <DialogContent>
        {/* Add/Edit Form */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {editingId ? '✏️ Edit Ad Account' : '➕ Add New Ad Account'}
            </Typography>
            {editingId && (
              <Button size="small" onClick={handleCancelEdit}>
                Cancel Edit
              </Button>
            )}
          </Box>

          <TextField
            fullWidth
            label="Client Name"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            helperText="e.g., OTC Kompally, Armario Pro"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Ad Account ID"
            value={formData.ad_account_id}
            onChange={(e) => setFormData({ ...formData, ad_account_id: e.target.value })}
            helperText="Numbers only, without 'act_' prefix (e.g., 123456789)"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Account Name (Optional)"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            helperText="Friendly name from Facebook"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              label="Currency"
            >
              <MenuItem value="INR">INR (₹) - Indian Rupees</MenuItem>
              <MenuItem value="USD">USD ($) - US Dollars</MenuItem>
              <MenuItem value="EUR">EUR (€) - Euros</MenuItem>
              <MenuItem value="GBP">GBP (£) - British Pounds</MenuItem>
              <MenuItem value="AUD">AUD (A$) - Australian Dollars</MenuItem>
              <MenuItem value="CAD">CAD (CA$) - Canadian Dollars</MenuItem>
              <MenuItem value="SGD">SGD (S$) - Singapore Dollars</MenuItem>
              <MenuItem value="AED">AED (د.إ) - UAE Dirhams</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Access Token"
            type="password"
            value={formData.access_token}
            onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
            helperText={editingId ? 'Leave blank to keep existing token' : 'Ads API token with ads_read permission'}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            startIcon={editingId ? <Edit /> : <Add />}
            onClick={handleAdd}
            disabled={!formData.client_name || !formData.ad_account_id || (!editingId && !formData.access_token)}
          >
            {editingId ? 'Update Ad Account' : 'Add Ad Account'}
          </Button>
        </Box>

        {/* Saved Ad Accounts List */}
        <Box>
          <Typography variant="h6" gutterBottom>Saved Ad Accounts</Typography>
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
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {account.client_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ad Account: {account.ad_account_id}
                </Typography>
                {account.account_name && (
                  <Typography variant="body2" color="text.secondary">
                    {account.account_name}
                  </Typography>
                )}
                <Typography variant="caption" color="primary">
                  Currency: {account.currency}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Added: {new Date(account.created_at).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  color="primary"
                  onClick={() => handleEdit(account)}
                  title="Edit account"
                >
                  <Edit />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleDelete(account.id)}
                  title="Delete account"
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}
          {adAccounts.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No ad accounts saved yet. Add one above to get started!
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdAccountManager;

