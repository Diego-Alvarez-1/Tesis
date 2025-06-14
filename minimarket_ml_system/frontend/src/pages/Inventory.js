import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Grid,
  CircularProgress, Alert, Box, Chip
} from '@mui/material';
import { Warning, CheckCircle } from '@mui/icons-material';
import { inventoryAPI, productAPI } from '../services/api';

const Inventory = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await productAPI.getLowStock();
        setLowStockProducts(response.data.products || []);
      } catch (err) {
        setError('Error cargando inventario');
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
        Control de Inventario
      </Typography>

      {lowStockProducts.length > 0 ? (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
              Hay {lowStockProducts.length} productos con stock bajo que requieren atención
            </Alert>
          </Grid>
          
          {lowStockProducts.map((product) => (
            <Grid item xs={12} md={6} lg={4} key={product.id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Código: {product.code}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Categoría: {product.category_name}
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Stock actual: <strong>{product.current_stock}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Stock mínimo: {product.min_stock}
                    </Typography>
                    <Typography variant="body2">
                      Punto de reorden: {product.reorder_point}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={product.stock_status}
                      color={product.stock_status === 'SIN_STOCK' ? 'error' : 'warning'}
                      size="small"
                    />
                    {product.needs_reorder && (
                      <Chip
                        label="Reorden requerido"
                        color="error"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card elevation={3}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              ¡Inventario en buen estado!
            </Typography>
            <Typography variant="body1" color="textSecondary">
              No hay productos con stock bajo en este momento
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Inventory;