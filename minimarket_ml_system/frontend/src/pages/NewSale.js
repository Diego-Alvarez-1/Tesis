import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Avatar,
  useTheme,
  alpha,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCart,
  Person,
  Payment,
  Receipt,
  Search,
  LocalOffer,
  AttachMoney,
  Save,
  Print,
  ArrowBack,
  QrCodeScanner,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { productAPI, customerAPI, salesAPI } from '../services/api';
import { useSnackbar } from 'notistack';

const ProductSearchCard = ({ onAddProduct }) => {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    // Simular productos disponibles
    setProducts([
      { id: 1, name: 'Coca Cola 600ml', code: 'PROD0001', sale_price: 3.50, current_stock: 45 },
      { id: 2, name: 'Pan Francés', code: 'PROD0002', sale_price: 0.30, current_stock: 120 },
      { id: 3, name: 'Leche Gloria 1L', code: 'PROD0003', sale_price: 4.90, current_stock: 30 },
      { id: 4, name: 'Arroz Costeño 5kg', code: 'PROD0004', sale_price: 22.90, current_stock: 15 },
    ]);
  }, []);

  const handleAddProduct = () => {
    if (selectedProduct) {
      onAddProduct({
        ...selectedProduct,
        quantity: 1,
        discount: 0,
        total: selectedProduct.sale_price
      });
      setSelectedProduct(null);
      setSearchTerm('');
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search />
          Agregar Productos
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            fullWidth
            options={products}
            getOptionLabel={(option) => `${option.name} - ${option.code}`}
            value={selectedProduct}
            onChange={(event, newValue) => setSelectedProduct(newValue)}
            inputValue={searchTerm}
            onInputChange={(event, newInputValue) => setSearchTerm(newInputValue)}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.code} • Stock: {option.current_stock} • S/. {option.sale_price}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar por nombre o código..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddProduct}
            disabled={!selectedProduct}
            sx={{ minWidth: 120, height: 56 }}
          >
            Agregar
          </Button>
          
          <IconButton
            sx={{
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.secondary.main, 0.2),
              },
            }}
          >
            <QrCodeScanner />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

const SaleItemRow = ({ item, onUpdateQuantity, onUpdateDiscount, onRemove }) => {
  const handleQuantityChange = (change) => {
    const newQuantity = Math.max(1, item.quantity + change);
    onUpdateQuantity(item.id, newQuantity);
  };

  return (
    <TableRow>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.code}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        S/. {item.sale_price.toFixed(2)}
      </TableCell>
      
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => handleQuantityChange(-1)}>
            <Remove />
          </IconButton>
          <TextField
            size="small"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
            sx={{ width: 60 }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
          <IconButton size="small" onClick={() => handleQuantityChange(1)}>
            <Add />
          </IconButton>
        </Box>
      </TableCell>
      
      <TableCell>
        <TextField
          size="small"
          type="number"
          value={item.discount}
          onChange={(e) => onUpdateDiscount(item.id, parseFloat(e.target.value) || 0)}
          sx={{ width: 80 }}
          inputProps={{ min: 0, max: 100 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />
      </TableCell>
      
      <TableCell align="right">
        <Typography variant="body2" fontWeight={600}>
          S/. {item.total.toFixed(2)}
        </Typography>
      </TableCell>
      
      <TableCell>
        <IconButton size="small" color="error" onClick={() => onRemove(item.id)}>
          <Delete />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

const NewSale = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [saleItems, setSaleItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    // Simular clientes
    setCustomers([
      { id: 1, name: 'Juan Pérez', document: '12345678', phone: '987654321' },
      { id: 2, name: 'María García', document: '87654321', phone: '123456789' },
    ]);
  }, []);

  const addProduct = (product) => {
    const existingIndex = saleItems.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      updateQuantity(product.id, saleItems[existingIndex].quantity + 1);
    } else {
      setSaleItems(prev => [...prev, product]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === productId) {
        const subtotal = item.sale_price * quantity;
        const discountAmount = subtotal * (item.discount / 100);
        return {
          ...item,
          quantity,
          total: subtotal - discountAmount
        };
      }
      return item;
    }));
  };

  const updateDiscount = (productId, discount) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === productId) {
        const subtotal = item.sale_price * item.quantity;
        const discountAmount = subtotal * (discount / 100);
        return {
          ...item,
          discount,
          total: subtotal - discountAmount
        };
      }
      return item;
    }));
  };

  const removeItem = (productId) => {
    setSaleItems(prev => prev.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const globalDiscountAmount = subtotal * (globalDiscount / 100);
    const discountedSubtotal = subtotal - globalDiscountAmount;
    const tax = discountedSubtotal * 0.18; // IGV 18%
    const total = discountedSubtotal + tax;
    
    return {
      subtotal: subtotal.toFixed(2),
      globalDiscountAmount: globalDiscountAmount.toFixed(2),
      discountedSubtotal: discountedSubtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSaveSale = async () => {
    if (saleItems.length === 0) {
      enqueueSnackbar('Agrega al menos un producto a la venta', { variant: 'warning' });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmSale = async () => {
    try {
      setSaving(true);
      
      const saleData = {
        customer: selectedCustomer?.id,
        payment_method: paymentMethod,
        discount_percentage: globalDiscount,
        items: saleItems.map(item => ({
          product: item.id,
          quantity: item.quantity,
          unit_price: item.sale_price,
          discount_percentage: item.discount
        }))
      };
      
      // await salesAPI.create(saleData);
      
      enqueueSnackbar('Venta registrada exitosamente', { variant: 'success' });
      navigate('/sales');
      
    } catch (error) {
      enqueueSnackbar('Error al registrar la venta', { variant: 'error' });
    } finally {
      setSaving(false);
      setConfirmDialogOpen(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          onClick={() => navigate('/sales')}
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
            Nueva Venta
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Registra una nueva venta de productos
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Products */}
        <Grid item xs={12} lg={8}>
          <ProductSearchCard onAddProduct={addProduct} />
          
          {/* Sale Items */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart />
                Productos en Venta ({saleItems.length})
              </Typography>
              
              {saleItems.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell>Precio</TableCell>
                        <TableCell>Cantidad</TableCell>
                        <TableCell>Desc. %</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {saleItems.map((item) => (
                        <SaleItemRow
                          key={item.id}
                          item={item}
                          onUpdateQuantity={updateQuantity}
                          onUpdateDiscount={updateDiscount}
                          onRemove={removeItem}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No hay productos en la venta
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Busca y agrega productos para comenzar la venta
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right Column - Sale Details */}
        <Grid item xs={12} lg={4}>
          {/* Customer Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person />
                Cliente
              </Typography>
              
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name} - ${option.document}`}
                value={selectedCustomer}
                onChange={(event, newValue) => setSelectedCustomer(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Buscar cliente (opcional)"
                    size="small"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {option.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.document} • {option.phone}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              
              {selectedCustomer && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedCustomer.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Doc: {selectedCustomer.document} • Tel: {selectedCustomer.phone}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Payment Method */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment />
                Método de Pago
              </Typography>
              
              <FormControl fullWidth size="small">
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="CASH">Efectivo</MenuItem>
                  <MenuItem value="CARD">Tarjeta</MenuItem>
                  <MenuItem value="YAPE">Yape</MenuItem>
                  <MenuItem value="PLIN">Plin</MenuItem>
                  <MenuItem value="TRANSFER">Transferencia</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
          
          {/* Discount */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer />
                Descuento General
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                type="number"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, max: 100 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </CardContent>
          </Card>
          
          {/* Total */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt />
                Resumen
              </Typography>
              
              <Box sx={{ space: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">S/. {totals.subtotal}</Typography>
                </Box>
                
                {globalDiscount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Descuento ({globalDiscount}%):</Typography>
                    <Typography variant="body2" color="error.main">-S/. {totals.globalDiscountAmount}</Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">IGV (18%):</Typography>
                  <Typography variant="body2">S/. {totals.tax}</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={700}>Total:</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    S/. {totals.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={handleSaveSale}
              disabled={saleItems.length === 0}
              sx={{ py: 1.5 }}
            >
              Registrar Venta
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Print />}
              disabled={saleItems.length === 0}
            >
              Vista Previa
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Confirmar Venta</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Se registrará una venta por S/. {totals.total}
          </Alert>
          
          <Typography variant="body2" gutterBottom>
            <strong>Cliente:</strong> {selectedCustomer?.name || 'Cliente ocasional'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Método de pago:</strong> {paymentMethod}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Productos:</strong> {saleItems.length} items
          </Typography>
          <Typography variant="body2">
            <strong>Total:</strong> S/. {totals.total}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={confirmSale}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Registrando...' : 'Confirmar Venta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NewSale;