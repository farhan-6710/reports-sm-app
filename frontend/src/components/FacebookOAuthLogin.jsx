import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Facebook, Instagram, Campaign, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const API_BASE = `${API_BASE_URL}/api/oauth_login.php`;

const FacebookOAuthLogin = ({ open, onClose, type = 'organic', onSuccess }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stateToken, setStateToken] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [error, setError] = useState('');

  const steps = ['Login with Facebook', 'Select Accounts', 'Complete'];

  useEffect(() => {
    // Check if returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state && open) {
      setStateToken(state);
      handleOAuthCallback(code, state);
    }
  }, [open]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}?action=get_login_url&type=${type}`);
      
      if (response.data.success) {
        setStateToken(response.data.state);
        // Redirect to Facebook login
        window.location.href = response.data.login_url;
      } else {
        setError('Failed to generate login URL');
      }
    } catch (error) {
      console.error('Error generating login URL:', error);
      setError('Failed to initiate login');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code, state) => {
    try {
      setLoading(true);
      
      const tokenResponse = await axios.get(
        `${API_BASE}?action=exchange_token&code=${code}&state=${state}`
      );
      
      if (!tokenResponse.data.success) {
        setError('Failed to complete authentication');
        return;
      }
      
      await fetchAccounts(state);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError('Failed to complete authentication');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (state) => {
    try {
      const accountsResponse = await axios.get(
        `${API_BASE}?action=get_accounts&state=${state}`
      );
      
      if (accountsResponse.data.success) {
        setAccounts(accountsResponse.data.accounts);
        setStep(1);
      } else {
        setError(accountsResponse.data.error || 'Failed to load accounts');
      }
    } catch (fetchError) {
      console.error('Error fetching accounts:', fetchError);
      setError('Failed to load accounts. Please try again.');
    }
  };

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleComplete = async () => {
    if (selectedAccounts.length === 0 || !stateToken) {
      alert('Please select at least one account');
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE}?action=connect_accounts`, {
        state: stateToken,
        selected_ids: selectedAccounts
      });
      
      if (response.data.success) {
      if (onSuccess) {
          onSuccess(response.data.connected_accounts || []);
        }
      } else {
        throw new Error(response.data.error || 'Failed to connect accounts');
      }
      
      setStep(2);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
      
    } catch (error) {
      console.error('Error saving accounts:', error);
      setError('Failed to save accounts');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep(0);
    setStateToken('');
    setAccounts([]);
    setSelectedAccounts([]);
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Facebook color="primary" />
          <Typography variant="h6">
            Connect {type === 'organic' ? 'Instagram/Facebook Pages' : 'Ad Accounts'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 0: Login */}
        {step === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Facebook sx={{ fontSize: 64, color: '#1877F2', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Login with Facebook
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click below to login with your Facebook account and grant permissions
            </Typography>
            
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Permissions we'll request:
              </Typography>
              <List dense>
                {type === 'organic' ? (
                  <>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Access to your Facebook Pages" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Access to Instagram Business accounts" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Read page insights and engagement" />
                    </ListItem>
                  </>
                ) : (
                  <>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Access to your Ad Accounts" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Read campaign and ad data" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="View ad performance metrics" />
                    </ListItem>
                  </>
                )}
              </List>
            </Box>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<Facebook />}
              onClick={handleLogin}
              disabled={loading}
              sx={{
                bgcolor: '#1877F2',
                '&:hover': { bgcolor: '#166FE5' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Login with Facebook'}
            </Button>
          </Box>
        )}

        {/* Step 1: Select Accounts */}
        {step === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select {type === 'organic' ? 'Pages/Instagram Accounts' : 'Ad Accounts'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose which accounts you want to connect for reporting
            </Typography>
            
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {accounts.map((account) => (
                  <ListItem
                    key={account.id}
                    button
                    onClick={() => handleAccountToggle(account.id)}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: selectedAccounts.includes(account.id) ? '#e3f2fd' : 'white'
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedAccounts.includes(account.id)}
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      {type === 'organic' ? (
                        account.instagram_business_account ? <Instagram color="error" /> : <Facebook color="primary" />
                      ) : (
                        <Campaign color="secondary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={account.name}
                      secondary={
                        type === 'organic'
                          ? account.instagram_business_account
                            ? `@${account.instagram_business_account.username} (Instagram)`
                            : 'Facebook Page'
                          : `${account.id} • ${account.currency}`
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
            
            {accounts.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No {type === 'organic' ? 'pages' : 'ad accounts'} found
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Successfully Connected!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAccounts.length} account(s) have been connected
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 0 && (
          <Button onClick={handleClose}>Cancel</Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={loading || selectedAccounts.length === 0}
            >
              Connect {selectedAccounts.length} Account(s)
            </Button>
          </>
        )}
        {step === 2 && (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FacebookOAuthLogin;

