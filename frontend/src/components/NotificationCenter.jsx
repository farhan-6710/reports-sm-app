import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  Box,
  Chip,
  Button,
} from '@mui/material';
import {
  Notifications,
  Circle,
  PersonAdd,
  Assessment,
  Error,
  CheckCircle,
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const NotificationCenter = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications.php?limit=10`);
      if (response.data && response.data.success) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/notifications.php?id=${notificationId}`);
      if (response.data && response.data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_account':
        return <PersonAdd color="primary" />;
      case 'new_report':
        return <Assessment color="success" />;
      case 'token_expired':
        return <Error color="error" />;
      default:
        return <Circle color="info" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'new_account':
        return '#2196F3';
      case 'new_report':
        return '#4CAF50';
      case 'token_expired':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} size="small" color="error" sx={{ ml: 1 }} />
          )}
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                sx={{
                  bgcolor: notification.is_read ? 'transparent' : '#f5f5f5',
                  borderLeft: `4px solid ${getColor(notification.type)}`,
                  '&:hover': { bgcolor: '#fafafa' }
                }}
              >
                <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                {!notification.is_read && (
                  <Circle sx={{ fontSize: 12, color: '#2196F3' }} />
                )}
              </ListItem>
            ))}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button size="small" onClick={() => {
            fetchNotifications();
            handleClose();
          }}>
            Refresh
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;

