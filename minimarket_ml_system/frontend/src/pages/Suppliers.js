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
  Chip,
  Avatar,
  useTheme,
  alpha,
  Skeleton,
  Switch,
  FormControlLabel,
  Tooltip,
  Zoom,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalShipping,
  Phone,
  Email,
  LocationOn,
  Business,
  Inventory,
  Visibility,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supplierAPI } from '../services/api';
import { useSnackbar } from 'notistack';

const SupplierCard = ({ supplier, onEdit, onDelete, onViewProducts }) => {
  const theme = useTheme();
  
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
        onClick={() => onViewProducts(supplier)}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                }}
              >
                <LocalShipping />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {supplier.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  RUC: {supplier.ruc}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Tooltip title="Editar proveedor">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(supplier);
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
              
              <Tooltip title="Eliminar proveedor">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(supplier);
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
          
          <Box sx={{ mb: 3, space: 1 }}>
            {supplier.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {supplier.phone}
                </Typography>
              </Box>
            )}
            
            {supplier.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {supplier.email}
                </Typography>
              </Box>
            )}
            
            {supplier.address && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {supplier.address}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={supplier.is_active ? 'Activo' : 'Inactivo'}
                color={supplier.is_active ? 'success' : 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              
              <Chip
                icon={<Inventory />}
                label={`${supplier.product_count || 0} productos`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={(e) => {
                e.stopPropagation();
                onViewProducts(supplier);
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

const SupplierForm = ({ open, onClose, supplier, onSaved }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    name: '',
    ruc: '',
    phone: '',
    email: '',
    address: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        ruc: supplier.ruc || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        is_active: supplier.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        ruc: '',
        phone: '',
        email: '',
        address: '',
        is_active: true,
      });
    }
  }, [supplier, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.ruc.trim()) {
      enqueueSnackbar('Nombre y RUC son requeridos', { variant: 'warning' });
      return;
    }

    if (formData.ruc.length !== 11) {
      enqueueSnackbar('RUC debe tener 11 dígitos', { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      
      if (supplier) {
        // await supplierAPI.update(supplier.id, formData);
        enqueueSnackbar('Proveedor actualizado exitosamente', { variant: 'success' });
      } else {
        // await supplierAPI.create(formData);
        enqueueSnackbar('Proveedor creado exitosamente', { variant: 'success' });
      }
      
      onSaved();
    } catch (error) {
      enqueueSnackbar('Error al guardar proveedor', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping />
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la empresa"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                autoFocus
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="RUC"
                value={formData.ruc}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setFormData(prev => ({ ...prev, ruc: value }));
                }}
                required
                inputProps={{ maxLength: 11 }}
                helperText="11 dígitos"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Dirección"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ alignSelf: 'flex-start', mt: 1 }} />
                    </InputAdornment>
                  ),
                }}
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
                label="Proveedor activo"
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
            {saving ? 'Guardando...' : (supplier ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Suppliers = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      // Simular datos por ahora
      const mockSuppliers = [
        {
          id: 1,
          name: 'Distribuidora Arequipa SAC',
          ruc: '20100123451',
          phone: '951234567',
          email: 'ventas@distarequipa.com',
          address: 'Av. Ejercito 123, Cercado, Arequipa',
          is_active: true,
          product_count: 45
        },
        {
          id: 2,
          name: 'Alimentos del Sur EIRL',
          ruc: '20100123452',
          phone: '952345678',
          email: 'contacto@alimentossur.com',
          address: 'Calle Mercaderes 456, Arequipa',
          is_active: true,
          product_count: 32
        },
        {
          id: 3,
          name: 'Lácteos Misti SA',
          ruc: '20100123453',
          phone: '953456789',
          email: 'pedidos@lacteosmisti.com',
          address: 'Parque Industrial, Arequipa',
          is_active: true,
          product_count: 18
        },
        {
          id: 4,
          name: 'Bebidas Peruanas SAC',
          ruc: '20100123454',
          phone: '954567890',
          email: 'ventas@bebidasperuanas.com',
          address: 'Zona Industrial Río Seco, Arequipa',
          is_active: false,
          product_count: 0
        },
      ];
      setSuppliers(mockSuppliers);
    } catch (error) {
      enqueueSnackbar('Error al cargar proveedores', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierFormOpen(true);
  };

  const handleDelete = async (supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // await supplierAPI.delete(selectedSupplier.id);
      enqueueSnackbar('Proveedor eliminado exitosamente', { variant: 'success' });
      fetchSuppliers();
      setDeleteDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Error al eliminar proveedor', { variant: 'error' });
    }
  };

  const handleViewProducts = (supplier) => {
    navigate(`/products?supplier=${supplier.id}`);
  };

  const handleSupplierSaved = () => {
    fetchSuppliers();
    setSupplierFormOpen(false);
    setSelectedSupplier(null);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.ruc.includes(searchTerm) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = suppliers.reduce((sum, supplier) => sum + (supplier.product_count || 0), 0);
  const activeSuppliers = suppliers.filter(supplier => supplier.is_active).length;

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
                bgcolor: 'info.main',
              }}
            >
              <LocalShipping />
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Proveedores
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Gestiona tus proveedores y sus productos asociados
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedSupplier(null);
            setSupplierFormOpen(true);
          }}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
          }}
        >
          Nuevo Proveedor
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
                {suppliers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Proveedores
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
                {activeSuppliers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Proveedores Activos
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
                Productos Suministrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Card sx={{ mb: 3, p: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar proveedores por nombre, RUC o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
      </Card>

      {/* Suppliers Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" height={32} />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" height={40} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredSuppliers.length > 0 ? (
        <Grid container spacing={3}>
          {filteredSuppliers.map((supplier) => (
            <Grid item xs={12} md={6} lg={4} key={supplier.id}>
              <SupplierCard
                supplier={supplier}
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
            <LocalShipping sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm 
              ? 'Intenta cambiar el término de búsqueda'
              : 'Comienza agregando tu primer proveedor para gestionar tus productos'
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setSelectedSupplier(null);
                setSupplierFormOpen(true);
              }}
            >
              Agregar Primer Proveedor
            </Button>
          )}
        </Card>
      )}

      {/* Supplier Form Dialog */}
      <SupplierForm
        open={supplierFormOpen}
        onClose={() => setSupplierFormOpen(false)}
        supplier={selectedSupplier}
        onSaved={handleSupplierSaved}
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
            ¿Estás seguro de que deseas eliminar el proveedor "{selectedSupplier?.name}"?
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

export default Suppliers;