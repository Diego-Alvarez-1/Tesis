import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Box,
  CircularProgress, Alert, Chip
} from '@mui/material';
import {
  TrendingUp, Inventory, ShoppingCart, Warning
} from '@mui/icons-material';
import { productAPI, salesAPI, analyticsAPI } from '../services/api';

const StatCard = ({ title, value, icon, color = 'primary', trend }) => (
  <Card elevation={3} sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color: `${color}.main`, fontWeight: 'bold' }}>
            {value}
          </Typography>
          {trend && (
            <Chip
              icon={<TrendingUp />}
              label={trend}
              size="small"
              color={trend.includes('+') ? 'success' : 'error'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Box sx={{ color: `${color}.main`, fontSize: 40 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    products: {},
    sales: {},
    analytics: {},
    lowStock: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [productsRes, salesRes, analyticsRes] = await Promise.all([
          productAPI.getDashboardStats(),
          salesAPI.getDashboardStats(),
          analyticsAPI.getDashboardOverview()
        ]);

        setData({
          products: productsRes.data,
          sales: salesRes.data,
          analytics: analyticsRes.data,
        });
      } catch (err) {
        setError('Error cargando datos del dashboard');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
        Dashboard Principal
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Productos"
            value={data.products.total_products || 0}
            icon={<Inventory />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ventas Hoy"
            value={`S/. ${data.sales.today?.total_amount?.toFixed(2) || '0.00'}`}
            icon={<ShoppingCart />}
            color="success"
            trend={`${data.sales.today?.sales_count || 0} ventas`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Stock Bajo"
            value={data.products.low_stock_products || 0}
            icon={<Warning />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ventas del Mes"
            value={`S/. ${data.sales.this_month?.total_amount?.toFixed(2) || '0.00'}`}
            icon={<TrendingUp />}
            color="info"
            trend={`${data.sales.this_month?.sales_count || 0} ventas`}
          />
        </Grid>

        {/* Analytics Summary */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumen de Ventas
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Hoy: {data.sales.today?.sales_count || 0} ventas
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ayer: {data.sales.yesterday?.sales_count || 0} ventas
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Este mes: {data.sales.this_month?.sales_count || 0} ventas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado del Inventario
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Productos sin stock: {data.products.out_of_stock_products || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Productos con stock bajo: {data.products.low_stock_products || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total productos: {data.products.total_products || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;