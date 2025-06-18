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
  Chip,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  alpha,
  Skeleton,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  TrendingUp,
  Inventory,
  AttachMoney,
  Category,
  LocalShipping,
  Timeline,
  Assessment,
  Warning,
  CheckCircle,
  Store,
  Psychology,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { productAPI, mlAPI } from '../services/api';
import { useSnackbar } from 'notistack';

const StatCard = ({ icon, label, value, color = 'primary', subtitle }) => {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        p: 2,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.05)} 0%, ${alpha(theme.palette[color].main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: alpha(theme.palette[color].main, 0.1),
            color: theme.palette[color].main,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette[color].main }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

const ProductDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [product, setProduct] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Aquí harías las llamadas reales a la API
      // Por ahora simulo datos
      const productData = {
        id: parseInt(id),
        name: 'Coca Cola 600ml',
        code: 'PROD0001',
        category_name: 'Bebidas',
        supplier_name: 'Distribuidora Sur',
        sale_price: 3.50,
        cost_price: 2.00,
        current_stock: 45,
        min_stock: 20,
        max_stock: 100,
        reorder_point: 30,
        stock_status: 'NORMAL',
        profit_margin: 75,
        is_perishable: false,
        brand: 'Coca Cola',
      };
      
      const salesData = [
        { date: '2025-06-15', quantity: 12, revenue: 42.00 },
        { date: '2025-06-14', quantity: 8, revenue: 28.00 },
        { date: '2025-06-13', quantity: 15, revenue: 52.50 },
        { date: '2025-06-12', quantity: 6, revenue: 21.00 },
        { date: '2025-06-11', quantity: 20, revenue: 70.00 },
      ];
      
      setProduct(productData);
      setSalesHistory(salesData);
      
      // Simular predicción ML
      if (selectedTab === 2) {
        setPredictions({
          next_30_days: 180,
          confidence: 92.5,
          trend: 'up',
          recommendations: [
            'Stock actual suficiente para 15 días',
            'Recomendado ordenar 60 unidades',
            'Producto con demanda estable'
          ]
        });
      }
      
    } catch (error) {
      enqueueSnackbar('Error al cargar datos del producto', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusInfo = (status) => {
    switch (status) {
      case 'SIN_STOCK':
        return { color: 'error', label: 'Sin Stock', icon: <Warning /> };
      case 'STOCK_BAJO':
        return { color: 'warning', label: 'Stock Bajo', icon: <Warning /> };
      case 'SOBRESTOCK':
        return { color: 'info', label: 'Sobrestock', icon: <TrendingUp /> };
      default:
        return { color: 'success', label: 'Normal', icon: <CheckCircle /> };
    }
  };

  const chartData = {
    labels: salesHistory.map(item => format(new Date(item.date), 'dd MMM', { locale: es })),
    datasets: [{
      label: 'Unidades Vendidas',
      data: salesHistory.map(item => item.quantity),
      borderColor: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      tension: 0.4,
      fill: true,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { 
        beginAtZero: true,
        grid: { color: alpha(theme.palette.divider, 0.5) }
      },
    },
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2, mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Alert severity="error">Producto no encontrado</Alert>
      </Container>
    );
  }

  const stockStatus = getStockStatusInfo(product.stock_status);

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          onClick={() => navigate('/products')}
          sx={{ 
            bgcolor: 'background.paper', 
            border: 1, 
            borderColor: 'divider',
          }}
        >
          <ArrowBack />
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {product.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Código: {product.code} • Categoría: {product.category_name}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate(`/products/${id}/edit`)}
          sx={{ borderRadius: 2 }}
        >
          Editar Producto
        </Button>
      </Box>

      {/* Product Info Card */}
      <Card sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                width: '100%',
                height: 300,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: theme.shadows[8],
              }}
            >
              <Store sx={{ fontSize: 80, color: 'white' }} />
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                icon={stockStatus.icon}
                label={stockStatus.label}
                color={stockStatus.color}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Información Básica
                </Typography>
                <Box sx={{ space: 1 }}>
                  <Typography variant="body2"><strong>Marca:</strong> {product.brand}</Typography>
                  <Typography variant="body2"><strong>Proveedor:</strong> {product.supplier_name}</Typography>
                  <Typography variant="body2"><strong>Tipo:</strong> {product.is_perishable ? 'Perecedero' : 'No perecedero'}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Precios y Márgenes
                </Typography>
                <Box sx={{ space: 1 }}>
                  <Typography variant="body2"><strong>Precio de Venta:</strong> S/. {product.sale_price}</Typography>
                  <Typography variant="body2"><strong>Precio de Costo:</strong> S/. {product.cost_price}</Typography>
                  <Typography variant="body2"><strong>Margen:</strong> {product.profit_margin.toFixed(1)}%</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Control de Inventario
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h6" color="primary">{product.current_stock}</Typography>
                      <Typography variant="caption">Stock Actual</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h6">{product.min_stock}</Typography>
                      <Typography variant="caption">Stock Mínimo</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h6">{product.max_stock}</Typography>
                      <Typography variant="caption">Stock Máximo</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h6">{product.reorder_point}</Typography>
                      <Typography variant="caption">Punto Reorden</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AttachMoney />}
            label="Ingresos (7 días)"
            value={`S/. ${salesHistory.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}`}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUp />}
            label="Unidades Vendidas"
            value={salesHistory.reduce((sum, item) => sum + item.quantity, 0)}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Inventory />}
            label="Días de Stock"
            value={Math.round(product.current_stock / (salesHistory.reduce((sum, item) => sum + item.quantity, 0) / 7))}
            color="info"
            subtitle="Al ritmo actual"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Assessment />}
            label="Rotación"
            value="Alta"
            color="warning"
            subtitle="Producto popular"
          />
        </Grid>
      </Grid>

      {/* Tabs Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Historial de Ventas" icon={<Timeline />} iconPosition="start" />
            <Tab label="Movimientos Stock" icon={<Inventory />} iconPosition="start" />
            <Tab label="Predicciones ML" icon={<Psychology />} iconPosition="start" />
          </Tabs>
        </Box>
        
        <CardContent sx={{ p: 3 }}>
          {selectedTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Ventas de los Últimos 7 Días
              </Typography>
              <Box sx={{ height: 300, mb: 3 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              
              <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Ingresos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesHistory.map((sale, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{format(new Date(sale.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell align="right">{sale.quantity} unidades</TableCell>
                        <TableCell align="right">S/. {sale.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Movimientos de Stock Recientes
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Aquí se mostrarían los movimientos de entrada y salida del producto
              </Alert>
            </Box>
          )}
          
          {selectedTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Predicciones de Machine Learning
              </Typography>
              
              {predictions ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Predicción de Demanda
                      </Typography>
                      <Typography variant="h4" color="primary" gutterBottom>
                        {predictions.next_30_days} unidades
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Próximos 30 días • Confianza: {predictions.confidence}%
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Nivel de confianza
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={predictions.confidence} 
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Recomendaciones
                      </Typography>
                      {predictions.recommendations.map((rec, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="body2">{rec}</Typography>
                        </Box>
                      ))}
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="warning">
                  No hay predicciones disponibles para este producto
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProductDetail;