import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Grid,
  Chip, CircularProgress, Alert, Box, TextField
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { productAPI } from '../services/api';

const ProductCard = ({ product }) => {
  const getStockColor = (status) => {
    switch (status) {
      case 'SIN_STOCK': return 'error';
      case 'STOCK_BAJO': return 'warning';
      case 'SOBRESTOCK': return 'info';
      default: return 'success';
    }
  };

  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom noWrap>
          {product.name}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Código: {product.code}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Categoría: {product.category_name}
        </Typography>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="h6" color="primary">
            S/. {product.sale_price}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2">
            Stock: {product.current_stock}
          </Typography>
          <Chip
            label={product.stock_status}
            color={getStockColor(product.stock_status)}
            size="small"
          />
        </Box>
        
        {product.needs_reorder && (
          <Chip
            label="Necesita reorden"
            color="warning"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </CardContent>
    </Card>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productAPI.getAll();
        setProducts(response.data.results || []);
        setFilteredProducts(response.data.results || []);
      } catch (err) {
        setError('Error cargando productos');
        console.error('Products error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

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
        Gestión de Productos
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Buscar productos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
        }}
        sx={{ mb: 3 }}
      />

      <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
        Mostrando {filteredProducts.length} de {products.length} productos
      </Typography>

      <Grid container spacing={3}>
        {filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>

      {filteredProducts.length === 0 && (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" color="textSecondary">
            No se encontraron productos
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Products;