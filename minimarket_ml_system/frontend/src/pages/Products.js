import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Skeleton,
  alpha,
  useTheme,
  Fab,
  Tooltip,
  Badge,
  CardActionArea,
  Zoom,
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Inventory,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  LocalOffer,
  Category,
  AttachMoney,
  BarChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { productAPI, categoryAPI } from '../services/api';
import ProductForm from '../components/products/ProductForm';
import StockAdjustmentDialog from '../components/products/StockAdjustmentDialog';
import { useSnackbar } from 'notistack';

const ProductCard = ({ product, onEdit, onDelete, onViewDetails, onAdjustStock }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'SIN_STOCK':
        return { color: 'error', label: 'Sin Stock' };
      case 'STOCK_BAJO':
        return { color: 'warning', label: 'Stock Bajo' };
      case 'SOBRESTOCK':
        return { color: 'info', label: 'Sobrestock' };
      default:
        return { color: 'success', label: 'Normal' };
    }
  };

  const stockStatus = getStockStatusColor(product.stock_status);
  
  // Generar imagen placeholder basada en la categoría
  const getProductImage = () => {
    const categoryImages = {
      'Bebidas': 'https://images.unsplash.com/photo-1534057308991-b9b3a578f1b1?w=400',
      'Abarrotes': 'https://images.unsplash.com/photo-1555411569-4f6549690c29?w=400',
      'Lácteos': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
      'Snacks': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
      'Limpieza': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
    };
    
    return categoryImages[product.category_name] || 
           `https://source.unsplash.com/400x300/?${product.category_name},product`;
  };

  return (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[12],
            '& .product-overlay': {
              opacity: 1,
            },
          },
        }}
      >
        <CardActionArea onClick={() => onViewDetails(product)}>
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <CardMedia
              component="img"
              height="200"
              image={getProductImage()}
              alt={product.name}
              sx={{
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
            
            {/* Overlay con información rápida */}
            <Box
              className="product-overlay"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <Button
                variant="contained"
                startIcon={<Visibility />}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(product);
                }}
              >
                Ver Detalles
              </Button>
            </Box>
            
            {/* Badges */}
            <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between' }}>
              <Chip
                label={product.category_name}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.9),
                  color: 'white',
                  fontWeight: 600,
                }}
                icon={<Category sx={{ color: 'white !important' }} />}
              />
              
              {product.needs_reorder && (
                <Tooltip title="Necesita reorden">
                  <Warning sx={{ color: 'warning.main', bgcolor: 'white', borderRadius: '50%', p: 0.5 }} />
                </Tooltip>
              )}
            </Box>
          </Box>
        </CardActionArea>
        
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flex: 1, pr: 1 }}>
              <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600 }}>
                {product.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Código: {product.code}
              </Typography>
            </Box>
            
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
              S/. {product.sale_price}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Costo: S/. {product.cost_price} • Margen: {product.profit_margin?.toFixed(1)}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">
                Stock: <strong>{product.current_stock}</strong>
              </Typography>
            </Box>
            
            <Chip
              label={stockStatus.label}
              color={stockStatus.color}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Min: ${product.min_stock}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label={`Max: ${product.max_stock}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label={`Reorden: ${product.reorder_point}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </CardContent>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              minWidth: 180,
            },
          }}
        >
          <MenuItem onClick={() => { handleMenuClose(); onViewDetails(product); }}>
            <Visibility sx={{ mr: 1, fontSize: 20 }} />
            Ver detalles
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); onEdit(product); }}>
            <Edit sx={{ mr: 1, fontSize: 20 }} />
            Editar
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); onAdjustStock(product); }}>
            <TrendingUp sx={{ mr: 1, fontSize: 20 }} />
            Ajustar stock
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); onDelete(product); }} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1, fontSize: 20 }} />
            Eliminar
          </MenuItem>
        </Menu>
      </Card>
    </Zoom>
  );
};

const Products = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustmentOpen, setStockAdjustmentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const itemsPerPage = 12;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, selectedCategory, stockFilter, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: itemsPerPage,
        search: searchTerm,
        ordering: sortBy,
      };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (stockFilter !== 'all') {
        params.stock_status = stockFilter;
      }
      
      const response = await productAPI.getAll(params);
      setProducts(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / itemsPerPage));
    } catch (error) {
      enqueueSnackbar('Error al cargar productos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data.results || []);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setProductFormOpen(true);
  };

  const handleDelete = async (product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await productAPI.delete(selectedProduct.id);
      enqueueSnackbar('Producto eliminado exitosamente', { variant: 'success' });
      fetchProducts();
      setDeleteDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Error al eliminar producto', { variant: 'error' });
    }
  };

  const handleViewDetails = (product) => {
    navigate(`/products/${product.id}`);
  };

  const handleAdjustStock = (product) => {
    setSelectedProduct(product);
    setStockAdjustmentOpen(true);
  };

  const handleProductSaved = () => {
    fetchProducts();
    setProductFormOpen(false);
    setSelectedProduct(null);
  };

  const handleStockAdjusted = () => {
    fetchProducts();
    setStockAdjustmentOpen(false);
    setSelectedProduct(null);
  };

  // Estadísticas rápidas
  const stats = useMemo(() => {
    if (!products.length) return { total: 0, lowStock: 0, outOfStock: 0, needsReorder: 0 };
    
    return {
      total: products.length,
      lowStock: products.filter(p => p.stock_status === 'STOCK_BAJO').length,
      outOfStock: products.filter(p => p.stock_status === 'SIN_STOCK').length,
      needsReorder: products.filter(p => p.needs_reorder).length,
    };
  }, [products]);

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Productos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona tu catálogo de productos
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedProduct(null);
            setProductFormOpen(true);
          }}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          Nuevo Producto
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Productos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.lowStock}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stock Bajo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {stats.outOfStock}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sin Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.needsReorder}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Necesitan Reorden
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                label="Categoría"
              >
                <MenuItem value="all">Todas las categorías</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Estado Stock</InputLabel>
              <Select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setPage(1);
                }}
                label="Estado Stock"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="SIN_STOCK">Sin Stock</MenuItem>
                <MenuItem value="STOCK_BAJO">Stock Bajo</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="SOBRESTOCK">Sobrestock</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                label="Ordenar por"
              >
                <MenuItem value="name">Nombre</MenuItem>
                <MenuItem value="-sale_price">Precio (Mayor a menor)</MenuItem>
                <MenuItem value="sale_price">Precio (Menor a mayor)</MenuItem>
                <MenuItem value="-current_stock">Stock (Mayor a menor)</MenuItem>
                <MenuItem value="current_stock">Stock (Menor a mayor)</MenuItem>
                <MenuItem value="-created_at">Más recientes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : products.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  onAdjustStock={handleAdjustStock}
                />
              </Grid>
            ))}
          </Grid>
          
          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <Inventory sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No se encontraron productos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all'
              ? 'Intenta cambiar los filtros de búsqueda'
              : 'Comienza agregando tu primer producto'}
          </Typography>
          {!searchTerm && selectedCategory === 'all' && stockFilter === 'all' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setSelectedProduct(null);
                setProductFormOpen(true);
              }}
            >
              Agregar Primer Producto
            </Button>
          )}
        </Card>
      )}

      {/* Dialogs */}
      <ProductForm
        open={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        product={selectedProduct}
        onSaved={handleProductSaved}
        categories={categories}
      />
      
      <StockAdjustmentDialog
        open={stockAdjustmentOpen}
        onClose={() => setStockAdjustmentOpen(false)}
        product={selectedProduct}
        onAdjusted={handleStockAdjusted}
      />
      
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el producto "{selectedProduct?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Products;