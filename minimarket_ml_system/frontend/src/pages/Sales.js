import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Grid,
  CircularProgress, Alert, Box, Chip
} from '@mui/material';
import { salesAPI } from '../services/api';

const SaleCard = ({ sale }) => (
  <Card elevation={2} sx={{ mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">
            {sale.sale_number}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {sale.customer_name || 'Cliente ocasional'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {new Date(sale.sale_date).toLocaleDateString()}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="h6" color="primary">
            S/. {sale.total}
          </Typography>
          <Chip
            label={sale.payment_method}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, statsRes] = await Promise.all([
          salesAPI.getAll(),
          salesAPI.getDashboardStats()
        ]);
        setSales(salesRes.data.results?.slice(0, 10) || []);
        setStats(statsRes.data);
      } catch (err) {
        setError('Error cargando ventas');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Gestión de Ventas
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            Últimas Ventas
          </Typography>
          {sales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumen de Ventas
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Hoy: S/. {stats.today?.total_amount?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ayer: S/. {stats.yesterday?.total_amount?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Este mes: S/. {stats.this_month?.total_amount?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Sales;