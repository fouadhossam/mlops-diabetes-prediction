import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

const Navbar = () => {
  const theme = useTheme();
  const location = useLocation();

  const navItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Predict', path: '/predict', icon: <AssessmentIcon /> },
    { text: 'Model Info', path: '/model-info', icon: <TimelineIcon /> },
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  ];

  return (
    <AppBar position="sticky" elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Diabetes Readmission Predictor
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.text}
                component={RouterLink}
                to={item.path}
                startIcon={item.icon}
                sx={{
                  color: 'inherit',
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 