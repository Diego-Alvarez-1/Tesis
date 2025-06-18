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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Skeleton,
  Switch,
  FormControlLabel,
  Tooltip,
  Zoom,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category as CategoryIcon,
  Inventory,
  TrendingUp,
  Visibility,
  Store,
  LocalOffer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { categoryAPI } from '../services/api';
import { useSnackbar } from 'notistack';

const CategoryCard = ({ category, onEdit, onDelete, onViewProducts }) => {
  const theme = useTheme();
  
  const categoryIcons = {
    'Bebidas': '🥤',
    'Abarrotes': '🛒',
    'Lácteos': '🥛',
    'Snacks': '🍿',
    'Limpieza': '🧽',
    'Panadería': '🍞',
    'Frutas y Verduras': '🥬',
    'Carnes y Embutidos': '🥩',
    'Cuidado Personal': '🧴',
    'Congelados': '🧊',
  };
  
  const getIcon = () => categoryIcons[category.name] || '📦';
  
  return (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[12],
          },
        }}
        onClick={() => onViewProducts(category)}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  fontSize: '2rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              >
                {getIcon()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {category.name}
                </Typography>
                <Chip
                  icon={<Inventory />}
                  label={`${category.product_count || 0} productos`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Tooltip title="Editar categoría">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(category);
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Eliminar categoría">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(category);
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.2),
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 3,
              minHeight: 40,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {category.description || 'Sin descripción disponible'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip
              label={category.is_active ? 'Activa' : 'Inactiva'}
              color={category.is_active ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={(e) => {
                e.stopPropagation();
                onViewProducts(category);
              }}
              sx={{ textTransform: 'none' }}
            >
              Ver productos
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
};

const CategoryForm = ({ open, onClose, category, onSaved }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        is_active: category.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
      });
    }
  }, [category, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      enqueueSnackbar('El nombre es requerido', { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      
      if (category) {
        await categoryAPI.update(category.id, formData);
        enqueueSnackbar('Categoría actualizada exitosamente', { variant: 'success' });
      } else {
        await categoryAPI.create(formData);
        enqueueSnackbar('Categoría creada exitosamente', { variant: 'success' });
      }
      
      onSaved();
    } catch (error) {
      enqueueSnackbar('Error al guardar categoría', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CategoryIcon />
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de la categoría"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                autoFocus
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe qué tipo de productos incluye esta categoría..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Categoría activa"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{ minWidth: 120 }}
          >
            {saving ? 'Guardando...' : (category ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Categories = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Simular datos por ahora
      const mockCategories = [
        { id: 1, name: 'Bebidas', description: 'Gaseosas, jugos, agua y bebidas en general', is_active: true, product_count: 25 },
        { id: 2, name: 'Abarrotes', description: 'Productos de primera necesidad', is_active: true, product_count: 18 },
        { id: 3, name: 'Lácteos', description: 'Leche, yogurt, queso y derivados lácteos', is_active: true, product_count: 12 },
        { id: 4, name: 'Snacks', description: 'Papitas, galletas y productos para picar', is_active: true, product_count: 15 },
        { id: 5, name: 'Limpieza', description: 'Productos de limpieza para el hogar', is_active: true, product_count: 8 },
        { id: 6, name: 'Panadería', description: 'Pan, pasteles y productos de panadería', is_active: false, product_count: 5 },
      ];
      setCategories(mockCategories);
    } catch (error) {
      enqueueSnackbar('Error al cargar categorías', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setCategoryFormOpen(true);
  };

  const handleDelete = async (category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // await categoryAPI.delete(selectedCategory.id);
      enqueueSnackbar('Categoría eliminada exitosamente', { variant: 'success' });
      fetchCategories();
      setDeleteDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Error al eliminar categoría', { variant: 'error' });
    }
  };

  const handleViewProducts = (category) => {
    navigate(`/products?category=${category.id}`);
  };

  const handleCategorySaved = () => {
    fetchCategories();
    setCategoryFormOpen(false);
    setSelectedCategory(null);
  };

  const totalProducts = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);
  const activeCategories = categories.filter(cat => cat.is_active).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'secondary.main',
                fontSize: '1.5rem',
              }}
            >
              📁
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Categorías
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Organiza tus productos por categorías para una mejor gestión
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedCategory(null);
            setCategoryFormOpen(true);
          }}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
          }}
        >
          Nueva Categoría
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {categories.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Categorías
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {activeCategories}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categorías Activas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {totalProducts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Productos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Categories Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" height={32} />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" height={60} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : categories.length > 0 ? (
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category.id}>
              <CategoryCard
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewProducts={handleViewProducts}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <CategoryIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay categorías creadas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Comienza creando tu primera categoría para organizar tus productos
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedCategory(null);
              setCategoryFormOpen(true);
            }}
          >
            Crear Primera Categoría
          </Button>
        </Card>
      )}

      {/* Category Form Dialog */}
      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        category={selectedCategory}
        onSaved={handleCategorySaved}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar la categoría "{selectedCategory?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer y podría afectar los productos asociados.
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

export default Categories;