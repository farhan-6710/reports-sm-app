import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './styles/print.css';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Typography,
  Divider,
  Collapse
} from '@mui/material';
import { 
  Assessment, 
  Campaign, 
  Settings, 
  History, 
  ExpandMore, 
  ExpandLess, 
  Dashboard as DashboardIcon, 
  PictureAsPdf,
  BarChart as BarChartIcon
} from '@mui/icons-material';

// Import Components
import Dashboard from './components/Dashboard';
import PerformanceSummaryReport from './components/PerformanceSummaryReport'; 
import PostsPerformanceTable from './components/PostsPerformanceTable';
import CampaignAnalytics from './components/CampaignAnalytics';
import UnifiedAccountManager from './components/UnifiedAccountManager';
import ReportsView from './components/ReportsView';
import OverviewDashboard from './components/OverviewDashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import CuratedReports from './components/CuratedReports';
import CustomReportBuilder from './components/CustomReportBuilder';
import ContentPerformanceReport from './components/ContentPerformanceReport';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
});

const drawerWidth = 280;

// --- SIDEBAR COMPONENT ---
function Sidebar({ onManageAccounts }: { onManageAccounts: () => void }) {
  const location = useLocation();
  const [reportsOpen, setReportsOpen] = useState(false);

  // --- CLEAN MENU ITEMS ---
  const menuItems = [
    { text: 'Dashboard Overview', icon: <DashboardIcon />, path: '/' },
    { text: 'Content Performance Report', icon: <BarChartIcon />, path: '/content-performance' },
    { text: 'Campaign Analytics', icon: <Campaign />, path: '/campaigns' },
    { text: 'Custom Report Builder', icon: <PictureAsPdf />, path: '/custom-report' },
  ];

  const reportTypes = [
    { text: 'Instagram Reports', path: '/reports/instagram' },
    { text: 'Facebook Reports', path: '/reports/facebook' },
    { text: 'Campaign Reports', path: '/reports/campaigns' },
    { text: 'Content Performance', path: '/reports/content_performance' },
    { text: 'All Reports', path: '/reports/all' },
  ];

  return (
    <Box 
      className="no-print" 
      sx={{ width: drawerWidth, flexShrink: 0 }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            DIGI CAROTENE
          </Typography>
          <Typography variant="caption" sx={{ letterSpacing: 1, opacity: 0.8 }}>
            GROWTH & ANALYTICS
          </Typography>
        </Box>
        
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        
        <List sx={{ px: 2, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                  },
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}

          {/* Recent Reports Dropdown */}
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => setReportsOpen(!reportsOpen)}
              sx={{ borderRadius: 2, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><History /></ListItemIcon>
              <ListItemText primary="Recent Reports" primaryTypographyProps={{ fontSize: '0.95rem' }} />
              {reportsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          <Collapse in={reportsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {reportTypes.map((report) => (
                <ListItem key={report.text} disablePadding sx={{ pl: 2 }}>
                  <ListItemButton
                    component={Link}
                    to={report.path}
                    selected={location.pathname === report.path}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                      },
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <ListItemText 
                      primary={report.text}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        fontWeight: location.pathname === report.path ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />

        <List sx={{ px: 2 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={onManageAccounts}
              sx={{ borderRadius: 2, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><Settings /></ListItemIcon>
              <ListItemText primary="Manage Accounts" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </Box>
  );
}

// --- APP COMPONENT ---
function App() {
  const [accountManagerOpen, setAccountManagerOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          
          <Sidebar onManageAccounts={() => setAccountManagerOpen(true)} />
          
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              bgcolor: '#f5f7fa',
              minHeight: '100vh',
              overflow: 'auto',
              '@media print': {
                 bgcolor: 'white',
                 width: '100%'
              }
            }}
          >
            <Routes>
              <Route path="/" element={<OverviewDashboard />} />
              <Route path="/unified-report" element={<PerformanceSummaryReport />} />
              <Route path="/content-performance" element={<ContentPerformanceReport />} />
              
              {/* Keep underlying routes accessible if needed, just hidden from UI */}
              <Route path="/organic" element={<Dashboard />} />
              <Route path="/posts" element={<PostsPerformanceTable />} />
              <Route path="/campaigns" element={<CampaignAnalytics />} />
              <Route path="/curated-reports" element={<CuratedReports />} />
              <Route path="/custom-report" element={<CustomReportBuilder />} />
              <Route path="/reports/instagram" element={<ReportsView filterType="instagram" />} />
              <Route path="/reports/facebook" element={<ReportsView filterType="facebook" />} />
              <Route path="/reports/campaigns" element={<ReportsView filterType="campaigns" />} />
              <Route path="/reports/content_performance" element={<ReportsView filterType="content_performance" />} />
              <Route path="/reports/all" element={<ReportsView filterType="all" />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            </Routes>
          </Box>
        </Box>
        
        <UnifiedAccountManager
          open={accountManagerOpen}
          onClose={() => setAccountManagerOpen(false)}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;