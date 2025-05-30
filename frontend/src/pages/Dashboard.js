import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  // Divider,
  // ToggleButtonGroup,
  // ToggleButton,
  LinearProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  // LineChart,
  // Line,
  // BarChart,
  // Bar,
  PieChart,
  Pie,
  Cell,
  // XAxis,
  // YAxis,
  // CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  // Legend,
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch model info specifically for LightGBM
        const modelResponse = await axios.get('http://localhost:5000/model-info/lightgbm');
        setModelInfo(modelResponse.data);

        // Fetch health status
        const healthResponse = await axios.get('http://localhost:5000/health');
        setHealth(healthResponse.data);

        // Fetch prediction history
        const predictionsResponse = await axios.get('http://localhost:5000/predictions');
        setPredictions(predictionsResponse.data);

        setLoading(false);
      } catch (err) {
        setError('Error fetching dashboard data. Please ensure the API is running.');
        setLoading(false);
      }
    };

    fetchData();
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate prediction distribution from real data
  const predictionDistribution = predictions.reduce((acc, pred) => {
    const key = pred.prediction;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const distributionData = Object.entries(predictionDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Calculate average response time from predictions
  const avgResponseTime = predictions.length > 0
    ? predictions.reduce((sum, pred) => sum + (pred.response_time || 0), 0) / predictions.length
    : 0;

  const handleClearPredictions = async () => {
    try {
      setClearing(true);
      await axios.post('http://localhost:5000/predictions/clear');
      setPredictions([]);
      setClearDialogOpen(false);
    } catch (err) {
      setError('Error clearing predictions. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Model Monitoring Dashboard (LightGBM)
      </Typography>

      {/* System Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>API Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip
                  label={health?.status || 'Unknown'}
                  color={health?.status === 'healthy' ? 'success' : 'error'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="h6">{health?.uptime || '0'}s</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={health?.status === 'healthy' ? 100 : 0}
                color={health?.status === 'healthy' ? 'success' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3.1}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Model Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip
                  label={health?.model_loaded ? 'Loaded' : 'Not Loaded'}
                  color={health?.model_loaded ? 'success' : 'error'}
                  size="small"
                  sx={{ mr: 1 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Last Updated: {new Date(modelInfo?.last_updated).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={1.9}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Predictions</Typography>
              <Typography variant="h4">{predictions.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Avg Response Time</Typography>
              <Typography variant="h4">{avgResponseTime.toFixed(2)}ms</Typography>
              <Typography variant="body2" color="textSecondary">
                Target: {'<'} 200ms
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((avgResponseTime / 100) * 100, 100)}
                color={avgResponseTime < 200 ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3}>
        {/* Model Metrics */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Model Performance Metrics</Typography>
            <Grid container spacing={2}>
              {modelInfo?.metrics && Object.entries(modelInfo.metrics).map(([metric, value]) => (
                <Grid item xs={4} key={metric}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        {metric.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="h4">
                        {(value * 100).toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Prediction Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Prediction Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v + ' predictions'} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Predictions Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Predictions</Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setClearDialogOpen(true)}
                disabled={predictions.length === 0}
              >
                Clear Predictions
              </Button>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Timestamp</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Prediction</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 10).map((pred, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', borderTop: '1px solid #ddd'}}>
                        {new Date(pred.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #ddd'}}>
                        <Chip
                          label={pred.prediction}
                          color={pred.prediction === 'Yes' ? 'success' : 'error'}
                          size="small"
                        />
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #ddd'}}>
                        <Chip
                          label={`${pred.response_time?.toFixed(2) || 'N/A'}ms`}
                          color={pred.response_time < 200 ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>

        {/* Clear Predictions Dialog */}
        <Dialog
          open={clearDialogOpen}
          onClose={() => setClearDialogOpen(false)}
        >
          <DialogTitle>Clear Predictions</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to clear all predictions? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialogOpen(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button
              onClick={handleClearPredictions}
              color="error"
              disabled={clearing}
              variant="contained"
            >
              {clearing ? 'Clearing...' : 'Clear'}
            </Button>
          </DialogActions>
        </Dialog>

      </Grid>
    </Container>
  );
};

export default Dashboard; 