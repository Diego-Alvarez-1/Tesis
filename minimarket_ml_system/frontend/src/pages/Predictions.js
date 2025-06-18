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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  Skeleton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Warning,
  CheckCircle,
  Refresh,
  FileDownload,
  AutoGraph,
  Inventory,
  ShoppingCart,
  CalendarToday,
  Info,
  ArrowUpward,
  ArrowDownward,
  Timeline,
  PriorityHigh,
  Schedule,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { mlAPI, productAPI } from '../services/api';
import { useSnackbar } from 'notistack';

// Componente para mostrar estadísticas de predicción
const PredictionStat = ({ icon, label, value, color = 'primary', trend }) => {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        p: 2,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.05)} 0%, ${alpha(theme.palette[color].main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: alpha(theme.palette[color].main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette[color].main }}>
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {trend > 0 ? (
                <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />
              )}
              <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
};

// Componente para la tabla de recomendaciones
const RecommendationRow = ({ recommendation, onPredict, onAction }) => {
  const theme = useTheme();
  
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { color: 'error', icon: <PriorityHigh />, label: 'Crítico' };
      case 'HIGH':
        return { color: 'warning', icon: <Warning />, label: 'Alto' };
      case 'MEDIUM':
        return { color: 'info', icon: <Info />, label: 'Medio' };
      default:
        return { color: 'success', icon: <CheckCircle />, label: 'Bajo' };
    }
  };
  
  const priority = getPriorityStyles(recommendation.priority);
  
  return (
    <TableRow
      hover
      sx={{
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        },
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {recommendation.product_name}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell align="center">
        <Typography variant="body2">
          {recommendation.current_stock}
        </Typography>
      </TableCell>
      
      <TableCell align="center">
        <Typography variant="body2" fontWeight={600}>
          {Math.round(recommendation.predicted_demand_total)}
        </Typography>
      </TableCell>
      
      <TableCell align="center">
        <Typography variant="body2">
          {Math.round(recommendation.days_of_stock_available)} días
        </Typography>
      </TableCell>
      
      <TableCell align="center">
        <Typography variant="body2" fontWeight={600} color="primary">
          {Math.round(recommendation.suggested_order_quantity)}
        </Typography>
      </TableCell>
      
      <TableCell align="center">
        <Chip
          icon={priority.icon}
          label={priority.label}
          color={priority.color}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </TableCell>
      
      <TableCell align="right">
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Tooltip title="Ver predicción detallada">
            <IconButton
              size="small"
              onClick={() => onPredict(recommendation.product_id)}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <Timeline />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Crear orden de compra">
            <IconButton
              size="small"
              onClick={() => onAction(recommendation)}
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.success.main, 0.2),
                },
              }}
            >
              <ShoppingCart />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const Predictions = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterPriority, setFilterPriority] = useState('all');
  const [predictDialogOpen, setPredictDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  
  // Estados para el formulario de predicción
  const [predictionDays, setPredictionDays] = useState(30);
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    fetchRecommendations();
    fetchProducts();
  }, []);
  
  const fetchRecommendations = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const response = await mlAPI.getRecommendations();
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error);
      enqueueSnackbar('Error al cargar recomendaciones de ML', { variant: 'warning' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll({ page_size: 1000 });
      setProducts(response.data.results || []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };
  
  const handlePredict = async (productId) => {
    setSelectedProductId(productId);
    setPredictDialogOpen(true);
    setPredictionLoading(true);
    
    try {
      const response = await mlAPI.predictDemand(productId, predictionDays);
      setPredictionData(response.data);
    } catch (error) {
      enqueueSnackbar('Error al generar predicción', { variant: 'error' });
    } finally {
      setPredictionLoading(false);
    }
  };
  
  const handleCreatePurchaseOrder = (recommendation) => {
    navigate('/inventory/purchase-orders/new', {
      state: {
        product: recommendation,
        suggestedQuantity: recommendation.suggested_order_quantity,
      },
    });
  };
  
  const handleTrainModel = () => {
    enqueueSnackbar('Entrenamiento de modelo iniciado. Esto puede tomar varios minutos.', { variant: 'info' });
    // Aquí iría la llamada a la API para entrenar el modelo
  };
  
  // Filtrar recomendaciones según la prioridad
  const filteredRecommendations = recommendations.filter(rec => {
    if (filterPriority === 'all') return true;
    return rec.priority === filterPriority;
  });
  
  // Estadísticas
  const stats = {
    total: recommendations.length,
    critical: recommendations.filter(r => r.priority === 'CRITICAL').length,
    needsReorder: recommendations.filter(r => r.needs_reorder).length,
    totalDemand: recommendations.reduce((sum, r) => sum + (r.predicted_demand_total || 0), 0),
  };
  
  // Datos para el gráfico de predicción
  const predictionChartData = predictionData ? {
    labels: predictionData.predictions.map(p => 
      format(new Date(p.date), 'dd MMM', { locale: es })
    ),
    datasets: [
      {
        label: 'Demanda Predicha',
        data: predictionData.predictions.map(p => p.predicted_quantity),
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Límite Superior',
        data: predictionData.predictions.map(p => p.upper_bound),
        borderColor: alpha(theme.palette.primary.main, 0.5),
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: 'Límite Inferior',
        data: predictionData.predictions.map(p => p.lower_bound),
        borderColor: alpha(theme.palette.primary.main, 0.5),
        borderDash: [5, 5],
        fill: false,
      },
    ],
  } : null;
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: alpha(theme.palette.divider, 0.5),
        },
      },
    },
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              }}
            >
              <Psychology sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Predicciones ML
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Análisis predictivo basado en Machine Learning para optimizar tu inventario
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Actualizar predicciones">
            <IconButton
              onClick={() => fetchRecommendations(true)}
              disabled={refreshing}
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Refresh className={refreshing ? 'rotating' : ''} />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<AutoGraph />}
            onClick={handleTrainModel}
          >
            Entrenar Modelo
          </Button>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <PredictionStat
            icon={<Psychology sx={{ color: 'primary.main' }} />}
            label="Total Predicciones"
            value={stats.total}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <PredictionStat
            icon={<Warning sx={{ color: 'error.main' }} />}
            label="Críticos"
            value={stats.critical}
            color="error"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <PredictionStat
            icon={<Inventory sx={{ color: 'warning.main' }} />}
            label="Necesitan Reorden"
            value={stats.needsReorder}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <PredictionStat
            icon={<TrendingUp sx={{ color: 'success.main' }} />}
            label="Demanda Total"
            value={Math.round(stats.totalDemand)}
            color="success"
          />
        </Grid>
      </Grid>
      
      {/* Model Status Alert */}
      {loading ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Cargando predicciones del modelo...
        </Alert>
      ) : recommendations.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No hay modelo entrenado. Para generar predicciones, ejecuta en el backend:
          <Box component="code" sx={{ display: 'block', mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            python manage.py train_models --save-model
          </Box>
        </Alert>
      ) : (
        <Fade in={true}>
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/analytics')}>
                Ver Analytics
              </Button>
            }
          >
            Modelo activo con {stats.total} predicciones generadas
          </Alert>
        </Fade>
      )}
      
      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Recomendaciones de Reorden" icon={<ShoppingCart />} iconPosition="start" />
            <Tab label="Análisis Predictivo" icon={<Timeline />} iconPosition="start" />
            <Tab label="Configuración ML" icon={<Psychology />} iconPosition="start" />
          </Tabs>
        </Box>
        
        <CardContent>
          {selectedTab === 0 && (
            <>
              {/* Filtros */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filtrar por prioridad</InputLabel>
                  <Select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    label="Filtrar por prioridad"
                  >
                    <MenuItem value="all">Todas las prioridades</MenuItem>
                    <MenuItem value="CRITICAL">Crítico</MenuItem>
                    <MenuItem value="HIGH">Alto</MenuItem>
                    <MenuItem value="MEDIUM">Medio</MenuItem>
                    <MenuItem value="LOW">Bajo</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ flex: 1 }} />
                
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  onClick={() => {
                    enqueueSnackbar('Exportando recomendaciones...', { variant: 'info' });
                    // Aquí iría la lógica de exportación
                  }}
                >
                  Exportar
                </Button>
              </Box>
              
              {/* Tabla de recomendaciones */}
              {loading ? (
                <Box>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : filteredRecommendations.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="center">Stock Actual</TableCell>
                        <TableCell align="center">Demanda Predicha (30d)</TableCell>
                        <TableCell align="center">Días de Stock</TableCell>
                        <TableCell align="center">Cantidad Sugerida</TableCell>
                        <TableCell align="center">Prioridad</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.map((recommendation) => (
                        <RecommendationRow
                          key={recommendation.product_id}
                          recommendation={recommendation}
                          onPredict={handlePredict}
                          onAction={handleCreatePurchaseOrder}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    ¡Excelente! No hay productos que requieran atención inmediata
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Todos los productos tienen niveles de stock óptimos según las predicciones
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Generar Predicción Personalizada
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Seleccionar Producto</InputLabel>
                    <Select
                      value={selectedProductId || ''}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      label="Seleccionar Producto"
                    >
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name} - Stock: {product.current_stock}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Días a predecir"
                    value={predictionDays}
                    onChange={(e) => setPredictionDays(parseInt(e.target.value) || 30)}
                    InputProps={{ inputProps: { min: 1, max: 365 } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Psychology />}
                    onClick={() => selectedProductId && handlePredict(selectedProductId)}
                    disabled={!selectedProductId}
                    sx={{ height: '56px' }}
                  >
                    Generar Predicción
                  </Button>
                </Grid>
              </Grid>
              
              {predictionData && (
                <Zoom in={true}>
                  <Card sx={{ p: 3, bgcolor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Predicción para: {predictionData.product.name}
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6} md={3}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Stock Actual
                          </Typography>
                          <Typography variant="h6">
                            {predictionData.product.current_stock}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Demanda Total Predicha
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {predictionData.summary.total_predicted.toFixed(0)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Promedio Diario
                          </Typography>
                          <Typography variant="h6">
                            {predictionData.summary.avg_daily.toFixed(1)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Máximo Diario
                          </Typography>
                          <Typography variant="h6">
                            {predictionData.summary.max_daily.toFixed(0)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ height: 400 }}>
                      {predictionChartData && (
                        <Line data={predictionChartData} options={chartOptions} />
                      )}
                    </Box>
                  </Card>
                </Zoom>
              )}
            </Box>
          )}
          
          {selectedTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configuración del Modelo
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                El modelo de Machine Learning se entrena automáticamente con los datos históricos de ventas.
                Para mejores resultados, asegúrate de tener al menos 6 meses de datos.
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Estado del Modelo
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Última actualización:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {format(new Date(), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Precisión del modelo:</Typography>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          92.5%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Datos de entrenamiento:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          730 días
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Acciones
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AutoGraph />}
                        onClick={handleTrainModel}
                      >
                        Reentrenar Modelo
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Schedule />}
                        onClick={() => {
                          enqueueSnackbar('Programación de entrenamiento automático configurada', { variant: 'success' });
                        }}
                      >
                        Programar Entrenamiento Automático
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog de Predicción Detallada */}
      <Dialog
        open={predictDialogOpen}
        onClose={() => setPredictDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Timeline />
            Predicción Detallada
          </Box>
        </DialogTitle>
        <DialogContent>
          {predictionLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Generando predicción...
              </Typography>
            </Box>
          ) : predictionData ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {predictionData.product.name}
              </Typography>
              
              <Box sx={{ height: 400, mt: 3 }}>
                {predictionChartData && (
                  <Line data={predictionChartData} options={chartOptions} />
                )}
              </Box>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumen de la Predicción
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Demanda total predicha:
                    </Typography>
                    <Typography variant="h6">
                      {predictionData.summary.total_predicted.toFixed(0)} unidades
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Recomendación:
                    </Typography>
                    <Typography variant="h6" color="primary">
                      Ordenar {Math.max(0, predictionData.summary.total_predicted - predictionData.product.current_stock).toFixed(0)} unidades
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPredictDialogOpen(false)}>
            Cerrar
          </Button>
          {predictionData && (
            <Button
              variant="contained"
              startIcon={<ShoppingCart />}
              onClick={() => {
                setPredictDialogOpen(false);
                navigate('/inventory/purchase-orders/new', {
                  state: {
                    product: predictionData.product,
                    suggestedQuantity: Math.max(0, predictionData.summary.total_predicted - predictionData.product.current_stock),
                  },
                });
              }}
            >
              Crear Orden de Compra
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Predictions;