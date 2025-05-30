import React, { useState, useEffect } from 'react';
import {
  Container, Tabs, Tab, Box, CircularProgress, Alert,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import axios from 'axios';
/* helper component in same file or separate – keeps chart code tidy */
import {
  Grid, Paper, Typography, Divider,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const ModelInfo = () => {
  const [models, setModels] = useState([]);
  const [current, setCurrent] = useState('');
  const [info, setInfo] = useState(null);
  const [allInfo, setAllInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [viewMode, setViewMode] = useState('individual');

  /* ------------ load model list on mount ---------------------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/models');
        setModels(data.models);
        setCurrent(data.models[0] || '');
      } catch (e) { setErr('cannot fetch model list'); }
    })();
  }, []);

  /* ------------ load selected model info ---------------------- */
  useEffect(() => {
    if (!current) return;
    setLoading(true);
    if (current === 'all') {
      Promise.all(models.map((m) =>
        axios.get(`http://localhost:5000/model-info/${m}`).then(res => res.data)
      ))
        .then((allData) => {
          setAllInfo(allData);
          setErr(null);
        })
        .catch(() => setErr('cannot fetch all models info'))
        .finally(() => setLoading(false));
    } else {
      (async () => {
        try {
          const { data } = await axios.get(`http://localhost:5000/model-info/${current}`);
          setInfo(data);
          setErr(null);
        } catch (e) { setErr('cannot fetch model info'); }
        finally { setLoading(false); }
      })();
    }
  }, [current, models]);

  if (err) return <Container><Alert severity="error">{err}</Alert></Container>;

  return (
    <Container maxWidth="lg">
      <Tabs
        value={current}
        onChange={(e, v) => setCurrent(v)}
        sx={{ mb: 3 }}
      >
        <Tab key="all" label="All" value="all" />
        {models.map((m) => <Tab key={m} label={m} value={m} />)}
      </Tabs>

      {current === 'all' && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="individual">Individual Charts</ToggleButton>
            <ToggleButton value="combined">Combined Chart</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        current === 'all' ? (
          viewMode === 'individual' ? (
            <Grid container spacing={3}>
              {allInfo.map((modelInfo, idx) => (
                <Grid item xs={12} md={6} key={modelInfo.name || idx}>
                  <MetricsCard info={modelInfo} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <CombinedMetricsCard infos={allInfo} />
          )
        ) : (
          info && <MetricsCard info={info} />
        )
      )}
    </Container>
  );
};

export default ModelInfo;

// Define blue color palette
const BLUE_COLORS = ['#1976d2', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9'];

const MetricsCard = ({ info }) => {
  const data = Object.entries(info.metrics).map(([k, v]) => ({
    name: k.replace('_', ' ').toUpperCase(),
    value: (v * 100).toFixed(2),
  }));

  return (
    <Grid container spacing={1}>
      {/* left – details */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Details</Typography>
          <Divider sx={{ my: 1 }} />
          {['name','created_at','last_updated'].map((f) => (
            <Typography key={f} sx={{ my: .5 }}>
              <b>{f.replace('_',' ')}</b>: {info[f]}
            </Typography>
          ))}
        </Paper>
      </Grid>

      {/* right – bar-chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill={BLUE_COLORS[0]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

const CombinedMetricsCard = ({ infos }) => {
  // Transform data for combined chart
  const metrics = Object.keys(infos[0].metrics);
  const data = metrics.map(metric => {
    const entry = { name: metric.replace('_', ' ').toUpperCase() };
    infos.forEach(info => {
      entry[info.name] = (info.metrics[metric] * 100).toFixed(2);
    });
    return entry;
  });

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

  return (
    <Paper sx={{ p: 3, height: 500 }}>
      <Typography variant="h6" gutterBottom>Combined Metrics Comparison</Typography>
      <Divider sx={{ my: 1 }} />
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(v) => `${v}%`} />
          {infos.map((info, idx) => (
            <Bar
              key={info.name}
              dataKey={info.name}
              fill={colors[idx % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
