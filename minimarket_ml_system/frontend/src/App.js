import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, useMediaQuery } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import esLocale from 'date-fns/locale/es';

// Theme
import theme from './theme/theme';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import SaleDetail from './pages/SaleDetail';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import StockMovements from './pages/StockMovements';
import PurchaseOrders from './pages/PurchaseOrders';
import InventoryCount from './pages/InventoryCount';
import Predictions from './pages/Predictions';
import PredictionDetail from './pages/PredictionDetail';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import PrivateRoute from './components/PrivateRoute';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [loading, setLoading] = useState(true);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    // Simular carga inicial
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} locale={esLocale}>
        <SnackbarProvider 
          maxSnack={3}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          autoHideDuration={4000}
        >
          <AuthProvider>
            <NotificationProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    
                    {/* Productos */}
                    <Route path="products" element={<Products />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    
                    {/* Ventas */}
                    <Route path="sales" element={<Sales />} />
                    <Route path="sales/new" element={<NewSale />} />
                    <Route path="sales/:id" element={<SaleDetail />} />
                    <Route path="customers" element={<Customers />} />
                    
                    {/* Inventario */}
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="inventory/movements" element={<StockMovements />} />
                    <Route path="inventory/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="inventory/count" element={<InventoryCount />} />
                    
                    {/* ML y Analytics */}
                    <Route path="predictions" element={<Predictions />} />
                    <Route path="predictions/:productId" element={<PredictionDetail />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="reports" element={<Reports />} />
                    
                    {/* Sistema */}
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;