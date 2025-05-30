import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Info as InfoIcon,
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Monitoring Dashboard',
      description: 'Access real-time monitoring of model performance and system health.',
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      path: '/dashboard',
      color: '#ed6c02',
    },
    {
      title: 'Performance Analytics',
      description: 'Analyze model performance metrics.',
      icon: <TimelineIcon sx={{ fontSize: 40 }} />,
      path: '/model-info',
      color: '#9c27b0',
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          px: 4,
          borderRadius: 2,
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Diabetes Readmission Prediction
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
          Advanced machine learning system for predicting diabetes patient readmission
          using comprehensive patient and hospital stay data.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => navigate('/predict')}
          sx={{ px: 4, py: 1.5 }}
        >
          Get Started
        </Button>
      </Box>

      {/* Features Grid */}
      <Grid container spacing={3}>
        {features.map((feature) => (
          <Grid item xs={12} md={6} key={feature.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    color: feature.color,
                  }}
                >
                  {feature.icon}
                  <Typography variant="h5" component="h2" sx={{ ml: 1 }}>
                    {feature.title}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate(feature.path)}
                  sx={{ color: feature.color }}
                >
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Information */}
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          About the Project
        </Typography>
        <Typography variant="body1" paragraph>
          This application uses machine learning to predict the likelihood of diabetes
          patient readmission. The system analyzes various
          factors including patient demographics, medical history, and hospital stay
          information to make accurate predictions.
        </Typography>
        <Typography variant="body1" paragraph>
          Key features of the system include:
        </Typography>
        <ul>
          <li>Real-time prediction using trained machine learning model</li>
          <li>Model performance monitoring and analytics</li>
          <li>User-friendly interface for healthcare professionals</li>
          <li>Detailed model information and performance metrics</li>
        </ul>
        <Typography variant="body1">
          The system is designed to help healthcare providers identify high-risk
          patients and take preventive measures to reduce readmission rates.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Home; 