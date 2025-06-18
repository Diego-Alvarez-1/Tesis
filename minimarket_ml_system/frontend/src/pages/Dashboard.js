import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Inventory,
  Warning,
  People,
  AttachMoney,
  Psychology,
  Refresh,
  ArrowForward,
  MoreVert,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { productAPI, salesAPI, analyticsAPI, mlAPI } from '../services/api';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const StatCard = ({ title, value, icon, color = 'primary', trend, loading, onClick, subtitle }) => {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        } : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${theme.palette[color].main} 0%, ${theme.palette[color].light} 100%)`,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={120} height={40} />
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette[color].main, mb: 1 }}>
                  {value}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </>
            )}
            {trend && !loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend.type === 'up' ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: trend.type === 'up' ? 'success.main' : 'error.main',
                    fontWeight: 600,
                  }}
                >
                  {trend.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vs. {trend.label}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: theme.palette[color].main,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const ChartCard = ({ title, children, action, loading = false }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
          {action}
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Skeleton variant="rectangular" width="100%" height={300} />
          </Box>
        ) : (
          <Box sx={{ height: 300, position: 'relative' }}>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    stats: {
      products: {},
      sales: {},
      inventory: {},
      predictions: {},
    },
    charts: {
      salesTrend: null,
      categoryDistribution: null,
      topProducts: null,
    },
    alerts: [],
  });

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const [productsRes, salesRes, analyticsRes, recommendationsRes] = await Promise.all([
        productAPI.getDashboardStats(),
        salesAPI.getDashboardStats(),
        analyticsAPI.getDashboardOverview(),
        mlAPI.getRecommendations().catch(() => ({ data: { recommendations: [] } })),
      ]);

      // Procesar datos para gráficos
      const salesByPeriod = await salesAPI.getSalesByPeriod(30);
      
      setData({
        stats: {
          products: productsRes.data,
          sales: salesRes.data,
          inventory: analyticsRes.data.summary || {},
          predictions: {
            criticalItems: recommendationsRes.data.recommendations?.filter(r => r.priority === 'CRITICAL').length || 0,
            totalRecommendations: recommendationsRes.data.recommendations?.length || 0,
          },
        },
        charts: {
          salesTrend: processSalesTrendData(salesByPeriod.data.data),
          categoryDistribution: productsRes.data.categories_stats,
          topProducts: analyticsRes.data.top_products,
        },
        alerts: recommendationsRes.data.recommendations?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const processSalesTrendData = (salesData) => {
    if (!salesData || salesData.length === 0) return null;
    
    const labels = salesData.map(item => 
      format(new Date(item.period), 'dd MMM', { locale: es })
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Ventas',
          data: salesData.map(item => item.total_amount),
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        grid: {
          color: alpha(theme.palette.divider, 0.5),
          borderDash: [3, 3],
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value) {
            return 'S/. ' + value.toLocaleString();
          },
        },
      },
    },
  };

  const categoryChartData = data.charts.categoryDistribution ? {
    labels: data.charts.categoryDistribution.map(cat => cat.category),
    datasets: [{
      data: data.charts.categoryDistribution.map(cat => cat.products_count),
      backgroundColor: [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.info.main,
        theme.palette.error.main,
      ],
      borderWidth: 0,
    }],
  } : null;

  const topProductsChartData = data.charts.topProducts ? {
    labels: data.charts.topProducts.map(p => p.product_name).slice(0, 10),
    datasets: [{
      label: 'Cantidad Vendida',
      data: data.charts.topProducts.map(p => p.quantity_sold).slice(0, 10),
      backgroundColor: alpha(theme.palette.primary.main, 0.8),
      borderRadius: 8,
    }],
  } : null;

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const percentChange = ((current - previous) / previous) * 100;
    return {
      type: percentChange >= 0 ? 'up' : 'down',
      value: `${Math.abs(percentChange).toFixed(1)}%`,
      label: 'ayer',
    };
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bienvenido de vuelta, aquí está el resumen de tu negocio
          </Typography>
        </Box>
        <Tooltip title="Actualizar datos">
          <IconButton 
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Refresh className={refreshing ? 'rotating' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ventas de Hoy"
            value={`S/. ${(data.stats.sales.today?.total_amount || 0).toFixed(2)}`}
            subtitle={`${data.stats.sales.today?.sales_count || 0} transacciones`}
            icon={<ShoppingCart />}
            color="primary"
            trend={calculateTrend(
              data.stats.sales.today?.total_amount,
              data.stats.sales.yesterday?.total_amount
            )}
            loading={loading}
            onClick={() => navigate('/sales')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Productos Activos"
            value={data.stats.products.total_products || 0}
            subtitle={`${data.stats.products.categories_stats?.length || 0} categorías`}
            icon={<Inventory />}
            color="success"
            loading={loading}
            onClick={() => navigate('/products')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Stock Bajo"
            value={data.stats.products.low_stock_products || 0}
            subtitle={`${data.stats.products.out_of_stock_products || 0} sin stock`}
            icon={<Warning />}
            color="warning"
            loading={loading}
            onClick={() => navigate('/inventory')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Alertas ML"
            value={data.stats.predictions.criticalItems || 0}
            subtitle={`${data.stats.predictions.totalRecommendations || 0} recomendaciones`}
            icon={<Psychology />}
            color="secondary"
            loading={loading}
            onClick={() => navigate('/predictions')}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <ChartCard 
            title="Tendencia de Ventas (Últimos 30 días)"
            loading={loading}
            action={
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/analytics')}
              >
                Ver más
              </Button>
            }
          >
            {data.charts.salesTrend && (
              <Line data={data.charts.salesTrend} options={chartOptions} />
            )}
          </ChartCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ChartCard 
            title="Distribución por Categoría"
            loading={loading}
          >
            {categoryChartData && (
              <Doughnut 
                data={categoryChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                          size: 12,
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* Bottom Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="600">
                  Alertas Críticas
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/alerts')}
                >
                  Ver todas
                </Button>
              </Box>
              
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : data.alerts.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {data.alerts.map((alert, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        border: 1,
                        borderColor: alpha(theme.palette.warning.main, 0.2),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.warning.main, 0.12),
                        },
                      }}
                      onClick={() => navigate(`/predictions/${alert.product_id}`)}
                    >
                      <Warning sx={{ color: 'warning.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="600">
                          {alert.product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stock: {alert.current_stock} | Demanda predicha: {alert.predicted_demand_total?.toFixed(0)}
                        </Typography>
                      </Box>
                      <Chip
                        label={alert.priority}
                        size="small"
                        color={alert.priority === 'CRITICAL' ? 'error' : 'warning'}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No hay alertas críticas en este momento
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <ChartCard 
            title="Top 10 Productos Más Vendidos"
            loading={loading}
            action={
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/reports')}
              >
                Ver reporte
              </Button>
            }
          >
            {topProductsChartData && (
              <Bar 
                data={topProductsChartData} 
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      ticks: {
                        ...chartOptions.scales.x.ticks,
                        callback: function(value) {
                          return value;
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <style jsx global>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </Container>
  );
};

export default Dashboard;