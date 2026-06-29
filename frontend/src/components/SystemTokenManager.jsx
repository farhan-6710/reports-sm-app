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
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  Chip,
} from '@mui/material';
import { VpnKey, CheckCircle, Error, Facebook, Instagram, Campaign } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const API_BASE = `${API_BASE_URL}/api`;

const SystemTokenManager = ({ open, onClose, onAccountsConnected }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null);
  const [availableAccounts, setAvailableAccounts] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedAdAccounts, setSelectedAdAccounts] = useState([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (open) {
      checkTokenStatus();
    }
  }, [open]);

  const checkTokenStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/system_token.php?action=get_token_status`);
      setTokenStatus(response.data);
    } catch (error) {
      console.error('Error checking token status:', error);
    }
  };

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/system_token.php?action=save_token`, {
        token: token.trim()
      });

      if (response.data.success) {
        setTokenStatus({ configured: true, valid: true });
        await fetchAllAccounts();
        alert('✅ Token saved successfully!');
      } else {
        setError(response.data.error || 'Failed to save token');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Invalid token. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccounts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE}/system_token.php?action=fetch_all_accounts`);

      if (response.data.success) {
        setAvailableAccounts({
          pages: response.data.pages || [],
          ad_accounts: response.data.ad_accounts || []
        });
        // Auto-select all by default
        setSelectedPages(response.data.pages.map(p => p.id));
        setSelectedAdAccounts(response.data.ad_accounts.map(a => a.account_id.replace('act_', '')));
      } else {
        setError(response.data.error || 'Failed to fetch accounts');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccounts = async () => {
    if (selectedPages.length === 0 && selectedAdAccounts.length === 0) {
      setError('Please select at least one account to connect');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/auto_connect.php`, {
        selected_page_ids: selectedPages,
        selected_ad_account_ids: selectedAdAccounts
      });

      if (response.data.success) {
        alert(`✅ Successfully connected ${response.data.total_connected} account(s)!`);
        if (onAccountsConnected) {
          onAccountsConnected(response.data.connected);
        }
        onClose();
      } else {
        setError(response.data.error || 'Failed to connect accounts');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to connect accounts');
    } finally {
      setConnecting(false);
    }
  };

  const handleTogglePage = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleToggleAdAccount = (adAccountId) => {
    const cleanId = adAccountId.replace('act_', '');
    setSelectedAdAccounts(prev =>
      prev.includes(cleanId)
        ? prev.filter(id => id !== cleanId)
        : [...prev, cleanId]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VpnKey color="primary" />
          <Typography variant="h6">Single Token Access</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {tokenStatus?.configured && tokenStatus?.valid && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ System token is configured and valid
          </Alert>
        )}

        {!tokenStatus?.configured && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Enter System User Token
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Get this from Facebook Business Manager → System Users → Generate Token
            </Typography>
            <TextField
              fullWidth
              label="System User Token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your System User Token here"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleSaveToken}
              disabled={loading || !token.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <VpnKey />}
            >
              {loading ? 'Validating...' : 'Save & Validate Token'}
            </Button>
          </Box>
        )}

        {tokenStatus?.configured && !availableAccounts && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Button
              variant="contained"
              onClick={fetchAllAccounts}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Fetching Accounts...' : 'Fetch All Available Accounts'}
            </Button>
          </Box>
        )}

        {availableAccounts && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Available Accounts ({selectedPages.length + selectedAdAccounts.length} selected)
            </Typography>

            {availableAccounts.pages.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Facebook color="primary" /> Facebook Pages ({availableAccounts.pages.length})
                </Typography>
                <List>
                  {availableAccounts.pages.map((page) => (
                    <ListItem
                      key={page.id}
                      button
                      onClick={() => handleTogglePage(page.id)}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: selectedPages.includes(page.id) ? '#e3f2fd' : 'white'
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox checked={selectedPages.includes(page.id)} />
                      </ListItemIcon>
                      <ListItemIcon>
                        <Facebook color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={page.name}
                        secondary={
                          <>
                            {page.id}
                            {page.instagram_business_account && (
                              <Chip
                                icon={<Instagram />}
                                label={`@${page.instagram_business_account.username}`}
                                size="small"
                                sx={{ ml: 1 }}
                                color="error"
                              />
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {availableAccounts.ad_accounts.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Campaign color="secondary" /> Ad Accounts ({availableAccounts.ad_accounts.length})
                </Typography>
                <List>
                  {availableAccounts.ad_accounts.map((account) => (
                    <ListItem
                      key={account.account_id}
                      button
                      onClick={() => handleToggleAdAccount(account.account_id)}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: selectedAdAccounts.includes(account.account_id.replace('act_', '')) ? '#e3f2fd' : 'white'
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox checked={selectedAdAccounts.includes(account.account_id.replace('act_', ''))} />
                      </ListItemIcon>
                      <ListItemIcon>
                        <Campaign color="secondary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={account.name || account.account_id}
                        secondary={`${account.account_id} • ${account.currency}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {availableAccounts.pages.length === 0 && availableAccounts.ad_accounts.length === 0 && (
              <Alert severity="info">
                No accounts found. Make sure your token has the required permissions.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {availableAccounts && (
          <Button
            variant="contained"
            onClick={handleConnectAccounts}
            disabled={connecting || (selectedPages.length === 0 && selectedAdAccounts.length === 0)}
            startIcon={connecting ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {connecting ? 'Connecting...' : `Connect ${selectedPages.length + selectedAdAccounts.length} Account(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SystemTokenManager;

