import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { accountsAPI } from '../services/api';
import FacebookOAuthLogin from './FacebookOAuthLogin';

const AccountManager = ({ open, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    platform: '',
    account_name: '',
    account_id: '',
    access_token: '',
  });
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAdd = async () => {
    try {
      if (editingId) {
        // Update existing account
        await accountsAPI.update(editingId, formData);
        setEditingId(null);
        alert('✅ Account updated successfully!');
      } else {
        // Add new account
        await accountsAPI.add(formData);
        alert('✅ Account added successfully!');
      }
      
      fetchAccounts();
      setFormData({
        platform: '',
        account_name: '',
        account_id: '',
        access_token: '',
      });
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account');
    }
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      platform: account.platform,
      account_name: account.account_name,
      account_id: account.account_id,
      access_token: '', // Don't show token for security
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      platform: '',
      account_name: '',
      account_id: '',
      access_token: '',
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this account?')) {
      try {
        await accountsAPI.delete(id);
        fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Manage Connected Accounts
        <Button variant="contained" onClick={() => setOauthDialogOpen(true)}>
          Connect via Facebook Login
        </Button>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {editingId ? '✏️ Edit Account' : '➕ Add New Account'}
            </Typography>
            {editingId && (
              <Button size="small" onClick={handleCancelEdit}>
                Cancel Edit
              </Button>
            )}
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              label="Platform"
            >
              <MenuItem value="facebook">Facebook</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="twitter">Twitter</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Account Name"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Platform ID / Username"
            value={formData.account_id}
            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Access Token"
            type="password"
            value={formData.access_token}
            onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
            helperText={editingId ? 'Leave blank to keep existing token' : 'Paste your access token'}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={editingId ? <Edit /> : <Add />}
            onClick={handleAdd}
            disabled={!formData.account_name || !formData.account_id}
          >
            {editingId ? 'Update Account' : 'Add Account'}
          </Button>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Connected Accounts
          </Typography>
          {accounts.map((account) => (
            <Box
              key={account.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                mb: 1,
                border: '1px solid #ccc',
                borderRadius: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1">
                  {account.account_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {account.platform.toUpperCase()} • {account.account_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
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
          {accounts.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
              No accounts connected yet
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <FacebookOAuthLogin
        open={oauthDialogOpen}
        onClose={() => setOauthDialogOpen(false)}
        type="organic"
        onSuccess={(connectedAccounts = []) => {
          fetchAccounts();
          if (connectedAccounts.length) {
            alert(`✅ Connected ${connectedAccounts.length} account(s) successfully`);
          }
          setOauthDialogOpen(false);
        }}
      />
    </Dialog>
  );
};

export default AccountManager;

