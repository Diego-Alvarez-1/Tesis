import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Grid,
  CircularProgress, Alert, Box, Chip, Button
} from '@mui/material';
import { Psychology, TrendingUp, Warning } from '@mui/icons-material';
import { mlAPI } from '../services/api';

const RecommendationCard = ({ recommendation }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'success';
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {recommendation.product_name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Stock actual: {recommendation.current_stock}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Demanda predicha: {recommendation.predicted_demand_total?.toFixed(1)} unidades
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Días de stock disponible: {recommendation.days_of_stock_available}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Chip
              label={recommendation.priority}
              color={getPriorityColor(recommendation.priority)}
              size="small"
              sx={{ mb: 1 }}
            />
            {recommendation.suggested_order_quantity > 0 && (
              <Typography variant="h6" color="primary">
                Ordenar: {Math.round(recommendation.suggested_order_quantity)}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Predictions = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.getRecommendations();
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      setError('Error cargando predicciones. Asegúrate de que hay un modelo entrenado.');
      console.error('Predictions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Predicciones de Machine Learning
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Psychology sx={{ color: 'primary.main' }} />
        <Typography variant="body1" color="textSecondary">
          Recomendaciones inteligentes basadas en análisis predictivo
        </Typography>
        <Button variant="outlined" size="small" onClick={fetchRecommendations}>
          Actualizar
        </Button>
      </Box>

      {error ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              Para generar predicciones, ejecuta: <code>python manage.py train_models --save-model</code>
            </Typography>
          </Box>
        </Alert>
      ) : recommendations.length > 0 ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Recomendaciones de Reorden
            </Typography>
            {recommendations
              .filter(rec => rec.needs_reorder)
              .slice(0, 10)
              .map((recommendation, index) => (
                <RecommendationCard key={index} recommendation={recommendation} />
              ))}
            
            {recommendations.filter(rec => rec.needs_reorder).length === 0 && (
              <Card elevation={3}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <TrendingUp sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    ¡Todo bajo control!
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    No hay productos que requieran reorden en este momento
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen de Predicciones
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total productos analizados: {recommendations.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Requieren reorden: {recommendations.filter(r => r.needs_reorder).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Prioridad crítica: {recommendations.filter(r => r.priority === 'CRITICAL').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Prioridad alta: {recommendations.filter(r => r.priority === 'HIGH').length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card elevation={3}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Warning sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No hay predicciones disponibles
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Entrena un modelo ML para generar recomendaciones
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Predictions;