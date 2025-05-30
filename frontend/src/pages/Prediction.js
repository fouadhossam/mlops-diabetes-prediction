/* eslint-disable camelcase */
import React, { useState } from 'react';
import {
  Container, Grid, Paper, Typography, TextField, Button, MenuItem,
  Box, Alert, CircularProgress, Card, CardContent, Tooltip,
  IconButton, InputAdornment,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Refresh as RefreshIcon, Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  CONSTANTS – keep in sync with the backend mapping CSVs            */
/* ------------------------------------------------------------------ */
const ICD9_PATTERN = /^[EV]?\d{3}(\.\d{1,2})?$/i;

const ADMISSION_TYPES = [
  { value: 1, label: 'Emergency' },
  { value: 2, label: 'Urgent' },
  { value: 3, label: 'Elective' },
  { value: 4, label: 'Newborn' },
  { value: 7, label: 'Trauma Center' },
];


const DISCHARGE_DISPOSITIONS = [
  { value: 1, label: 'Discharged to home' },
  { value: 2, label: 'Discharged/transferred to another short term hospital' },
  { value: 3, label: 'Discharged/transferred to SNF' },
  { value: 4, label: 'Discharged/transferred to ICF' },
  { value: 5, label: 'Discharged/transferred to another type of inpatient care institution' },
  { value: 6, label: 'Discharged/transferred to home with home health service' },
  { value: 7, label: 'Left AMA' },
  { value: 8, label: 'Discharged/transferred to home under care of Home IV provider' },
  { value: 9, label: 'Admitted as an inpatient to this hospital' },
  { value: 10, label: 'Neonate discharged to another hospital for neonatal aftercare' },
  { value: 11, label: 'Expired' },
  { value: 12, label: 'Still patient or expected to return for outpatient services' },
  { value: 13, label: 'Hospice / home' },
  { value: 14, label: 'Hospice / medical facility' },
  { value: 15, label: 'Discharged/transferred within this institution to Medicare approved swing bed' },
  { value: 16, label: 'Discharged/transferred/referred another institution for outpatient services' },
  { value: 17, label: 'Discharged/transferred/referred to this institution for outpatient services' },
  { value: 19, label: 'Expired at home. Medicaid only, hospice.' },
  { value: 20, label: 'Expired in a medical facility. Medicaid only, hospice.' },
  { value: 21, label: 'Expired, place unknown. Medicaid only, hospice.' },
  { value: 22, label: 'Discharged/transferred to another rehab fac including rehab units of a hospital .' },
  { value: 23, label: 'Discharged/transferred to a long term care hospital.' },
  { value: 24, label: 'Discharged/transferred to a nursing facility certified under Medicaid but not certified under Medicare.' },
  { value: 27, label: 'Discharged/transferred to a federal health care facility.' },
  { value: 28, label: 'Discharged/transferred/referred to a psychiatric hospital of psychiatric distinct part unit of a hospital' },
  { value: 29, label: 'Discharged/transferred to a Critical Access Hospital (CAH).' },
  { value: 30, label: 'Discharged/transferred to another Type of Health Care Institution not Defined Elsewhere' },
];


const ADMISSION_SOURCES = [
  { value: 1, label: 'Physician Referral' },
  { value: 2, label: 'Clinic Referral' },
  { value: 3, label: 'HMO Referral' },
  { value: 4, label: 'Transfer from a hospital' },
  { value: 5, label: 'Transfer from a Skilled Nursing Facility (SNF)' },
  { value: 6, label: 'Transfer from another health care facility' },
  { value: 7, label: 'Emergency Room' },
  { value: 8, label: 'Court/Law Enforcement' },
  { value: 10, label: 'Transfer from critial access hospital' },
  { value: 11, label: 'Normal Delivery' },
  { value: 12, label: 'Premature Delivery' },
  { value: 13, label: 'Sick Baby' },
  { value: 14, label: 'Extramural Birth' },
  { value: 18, label: 'Transfer From Another Home Health Agency' },
  { value: 19, label: 'Readmission to Same Home Health Agency' },
  { value: 22, label: 'Transfer from hospital inpt/same fac reslt in a sep claim' },
  { value: 23, label: 'Born inside this hospital' },
  { value: 24, label: 'Born outside this hospital' },
  { value: 25, label: 'Transfer from Ambulatory Surgery Center' },
  { value: 26, label: 'Transfer from Hospice' },
];


const DRUG_STATUSES = [
  { value: 'No', label: 'No' },
  { value: 'Steady', label: 'Steady' },
  { value: 'Up', label: 'Up' },
  { value: 'Down', label: 'Down' },
];

const MAX_VALUES = {
  time_in_hospital: 14,
  num_lab_procedures: 132,
  num_procedures: 6,
  num_medications: 81,
  number_outpatient: 42,
  number_emergency: 76,
  number_inpatient: 21,
  number_diagnoses: 16,
};

const HELP_TEXT = {
  diag_1: 'ICD-9 code e.g. 250.83',
  diag_2: 'ICD-9 code e.g. 401.9',
  diag_3: 'ICD-9 code e.g. 272.4',
};

const ICD9_CATEGORIES = {
  'Infectious and parasitic diseases': '001-139',
  'Neoplasms': '140-239',
  'Endocrine, nutritional and metabolic diseases, and immunity disorders': '240-279',
  'Diseases of the blood and blood-forming organs': '280-289',
  'Mental disorders': '290-319',
  'Diseases of the nervous system and sense organs': '320-389',
  'Diseases of the circulatory system': '390-459',
  'Diseases of the respiratory system': '460-519',
  'Diseases of the digestive system': '520-579',
  'Diseases of the genitourinary system': '580-629',
  'Complications of pregnancy, childbirth, and the puerperium': '630-679',
  'Diseases of the skin and subcutaneous tissue': '680-709',
  'Diseases of the musculoskeletal system and connective tissue': '710-739',
  'Congenital anomalies': '740-759',
  'Perinatal conditions': '760-779',
  'Symptoms, signs, and ill-defined conditions': '780-799',
  'Injury and poisoning': '800-999',
  'External/Supplemental': 'E/V codes',
};

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */
const Prediction = () => {
  /* -------------- state ------------------------------------------ */
  const [formData, setFormData] = useState({
    race: '',
    gender: '',
    age: '',
    admission_type_id: '',
    discharge_disposition_id: '',
    admission_source_id: '',
    time_in_hospital: '',
    num_lab_procedures: '',
    num_procedures: '',
    num_medications: '',
    number_outpatient: '',
    number_emergency: '',
    number_inpatient: '',
    number_diagnoses: '',
    diag_1: '',
    diag_2: '',
    diag_3: '',
    change: '',
    diabetesMed: '',
    /* drugs */
    metformin: '', repaglinide: '', nateglinide: '', chlorpropamide: '',
    glimepiride: '', acetohexamide: '', glipizide: '', glyburide: '',
    tolbutamide: '', pioglitazone: '', rosiglitazone: '', acarbose: '',
    miglitol: '', troglitazone: '', tolazamide: '', examide: '',
    citoglipton: '', insulin: '', 'glyburide-metformin': '',
    'glipizide-metformin': '', 'glimepiride-pioglitazone': '',
    'metformin-rosiglitazone': '', 'metformin-pioglitazone': '',
  });
  const [errors, setErrors] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  /* -------------- helpers ---------------------------------------- */
  const validateField = (name, value) => {
    if (!value) return 'Required';
    if (name.startsWith('diag_') && !ICD9_PATTERN.test(value)) {
      return 'Invalid ICD-9 code';
    }
    if (name in MAX_VALUES) {
      const v = Number(value);
      if (Number.isNaN(v) || v < 0 || v > MAX_VALUES[name]) {
        return `0 – ${MAX_VALUES[name]}`;
      }
    }
    if (name === 'time_in_hospital') {
      const v = Number(value);
      if (v < 1 || v > MAX_VALUES.time_in_hospital) {
        return `1 – ${MAX_VALUES.time_in_hospital}`;
      }
    }
    return '';
  };

  const handleChange = ({ target: { name, value } }) => {
    setFormData((s) => ({ ...s, [name]: value }));
    setErrors((s) => ({ ...s, [name]: validateField(name, value) }));
  };

  const resetForm = () => {
    setFormData((s) => Object.fromEntries(Object.keys(s).map((k) => [k, ''])));
    setErrors({});
    setPrediction(null);
    setApiError(null);
  };

  const validateForm = () => {
    const next = {};
    Object.entries(formData).forEach(([k, v]) => {
      const e = validateField(k, v);
      if (e) next[k] = e;
    });
    setErrors(next);
    return !Object.keys(next).length;
  };

  /* -------------- submit ----------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError(null);
    setPrediction(null);

    try {
      const { data } = await axios.post('http://localhost:5000/predict', formData);
      setPrediction(data);
    } catch (err) {
      setApiError(err.response?.data?.error || 'API error');
    } finally {
      setLoading(false);
    }
  };

  /* -------------- UI --------------------------------------------- */
  const renderSelect = (name, label, options) => (
    <TextField
      select required fullWidth margin="normal"
      label={label} name={name} value={formData[name]} onChange={handleChange}
      error={!!errors[name]} helperText={errors[name]}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </TextField>
  );

  const renderNumber = (name, label) => (
    <TextField
      type="number" required fullWidth margin="normal"
      label={label} name={name} value={formData[name]} onChange={handleChange}
      error={!!errors[name]} helperText={errors[name]}
      inputProps={{ min: 0 }}
    />
  );

  const renderICD9 = (name, label) => (
    <TextField
      required fullWidth margin="normal"
      label={label} name={name} value={formData[name]} onChange={handleChange}
      error={!!errors[name]} helperText={errors[name]}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={HELP_TEXT[name]}>
              <IconButton size="small"><InfoIcon fontSize="small" /></IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Predict Readmission</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={resetForm}>
          Reset
        </Button>
      </Box>

      {apiError && <Alert severity="error" sx={{ mb: 3 }}>{apiError}</Alert>}

      <Grid container spacing={3}>
        {/* ---------------------------- form ------------------------- */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {/* Demographics */}
              <Typography variant="h6" sx={{ mb: 1 }}>Demographics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  {renderSelect('race', 'Race', [
                    'Caucasian', 'AfricanAmerican', 'Hispanic', 'Asian', 'Other',
                  ].map((r) => ({ value: r, label: r })))}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderSelect('gender', 'Gender', [
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                  ])}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderSelect('age', 'Age Range', [
                    '[0-10)','[10-20)','[20-30)','[30-40)','[40-50)',
                    '[50-60)','[60-70)','[70-80)','[80-90)','[90-100)',
                  ].map((a) => ({ value: a, label: a.replace('[','').replace(')','') })))}
                </Grid>
              </Grid>

              {/* Admission */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Admission</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  {renderSelect('admission_type_id', 'Admission Type', ADMISSION_TYPES)}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderSelect('discharge_disposition_id', 'Discharge Disposition', DISCHARGE_DISPOSITIONS)}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderSelect('admission_source_id', 'Admission Source', ADMISSION_SOURCES)}
                </Grid>
              </Grid>

              {/* Counts */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Stay & Visits</Typography>
              <Grid container spacing={2}>
                {['time_in_hospital','num_lab_procedures','num_procedures','num_medications',
                  'number_outpatient','number_emergency','number_inpatient','number_diagnoses',
                ].map((f) => (
                  <Grid key={f} item xs={12} md={3}>{renderNumber(f, f.replace(/_/g,' '))}</Grid>
                ))}
              </Grid>

              {/* Diagnoses */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Diagnoses (ICD-9)</Typography>
              <Grid container spacing={2}>
                {['diag_1','diag_2','diag_3'].map((d) => (
                  <Grid key={d} item xs={12} md={4}>{renderICD9(d, d.toUpperCase())}</Grid>
                ))}
              </Grid>

              {/* Med changes */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Medication</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {renderSelect('change', 'Change in Meds', [
                    { value: 'Ch', label: 'Yes' },
                    { value: 'No', label: 'No' },
                  ])}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderSelect('diabetesMed', 'Diabetes Medication', [
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                  ])}
                </Grid>
              </Grid>

              {/* Drugs */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Drug Status</Typography>
              <Grid container spacing={2}>
                {[
                  'metformin','repaglinide','nateglinide','chlorpropamide','glimepiride',
                  'acetohexamide','glipizide','glyburide','tolbutamide','pioglitazone',
                  'rosiglitazone','acarbose','miglitol','troglitazone','tolazamide',
                  'examide','citoglipton','insulin','glyburide-metformin',
                  'glipizide-metformin','glimepiride-pioglitazone',
                  'metformin-rosiglitazone','metformin-pioglitazone',
                ].map((drug) => (
                  <Grid key={drug} item xs={12} sm={6} md={4}>
                    {renderSelect(drug, drug.replace(/[-_]/g, ' '), DRUG_STATUSES)}
                  </Grid>
                ))}
              </Grid>

              {/* submit */}
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <LoadingButton
                  type="submit" variant="contained" size="large"
                  loading={loading} loadingIndicator={<CircularProgress size={24} />}
                >
                  Predict
                </LoadingButton>
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* --------------- result panel ------------------------------ */}
        <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, minHeight: 200, elevation: 3 }}>
          <Typography variant="h6" gutterBottom>
            Result
          </Typography>

          {loading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          )}

          {prediction && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  gutterBottom
                  color={prediction.prediction === 'Yes' ? 'success.main' : 'error.main'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {prediction.prediction}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>


          {/* Diagnosis Categories Reference */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>ICD-9 Categories Reference</Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              {Object.entries(ICD9_CATEGORIES).map(([category, range]) => (
                <Box key={category} sx={{ mb: 1, p: 1, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle2" color="primary">
                    {range}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Note: E/V codes are used for external causes of injury and supplementary classification
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Source: <a 
                  href="https://en.wikipedia.org/wiki/List_of_ICD-9_codes"
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  Wikipedia - List of ICD-9 codes
                </a>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Prediction;
