import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Category as CategoryIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  Warning as WarningIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const drawerWidth = 280;

const menuItems = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    title: 'Productos',
    icon: <InventoryIcon />,
    children: [
      { title: 'Lista de Productos', path: '/products', icon: <StoreIcon /> },
      { title: 'Categorías', path: '/categories', icon: <CategoryIcon /> },
      { title: 'Proveedores', path: '/suppliers', icon: <LocalShippingIcon /> },
    ],
  },
  {
    title: 'Ventas',
    icon: <ShoppingCartIcon />,
    children: [
      { title: 'Todas las Ventas', path: '/sales', icon: <ReceiptIcon /> },
      { title: 'Nueva Venta', path: '/sales/new', icon: <TrendingUpIcon /> },
      { title: 'Clientes', path: '/customers', icon: <PeopleIcon /> },
    ],
  },
  {
    title: 'Inventario',
    icon: <AssignmentIcon />,
    children: [
      { title: 'Estado General', path: '/inventory', icon: <InventoryIcon /> },
      { title: 'Movimientos', path: '/inventory/movements', icon: <TrendingUpIcon /> },
      { title: 'Órdenes de Compra', path: '/inventory/purchase-orders', icon: <LocalShippingIcon /> },
      { title: 'Conteo Físico', path: '/inventory/count', icon: <AssignmentIcon /> },
    ],
  },
  {
    title: 'Predicciones ML',
    path: '/predictions',
    icon: <PsychologyIcon />,
  },
  {
    title: 'Analytics',
    icon: <BarChartIcon />,
    children: [
      { title: 'Panel Analytics', path: '/analytics', icon: <BarChartIcon /> },
      { title: 'Reportes', path: '/reports', icon: <AssessmentIcon /> },
    ],
  },
  {
    title: 'Alertas',
    path: '/alerts',
    icon: <WarningIcon />,
  },
  {
    title: 'Configuración',
    path: '/settings',
    icon: <SettingsIcon />,
  },
];

function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user, logout } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotif, setAnchorElNotif] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (title) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleNotifMenuOpen = (event) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleNotifMenuClose = () => {
    setAnchorElNotif(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPathActive = (path) => location.pathname === path;
  const isParentActive = (children) => children?.some(child => location.pathname === child.path);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <StoreIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="primary">
              MiniMarket ML
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sistema Inteligente
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      
      <Divider />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <React.Fragment key={item.title}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => item.children ? handleMenuClick(item.title) : handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    backgroundColor: item.path && isPathActive(item.path) 
                      ? alpha(theme.palette.primary.main, 0.12)
                      : isParentActive(item.children)
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: (item.path && isPathActive(item.path)) || isParentActive(item.children)
                        ? 'primary.main' 
                        : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.title}
                    primaryTypographyProps={{
                      fontWeight: (item.path && isPathActive(item.path)) || isParentActive(item.children) ? 600 : 400,
                      color: (item.path && isPathActive(item.path)) || isParentActive(item.children) ? 'primary.main' : 'text.primary',
                    }}
                  />
                  {item.children && (
                    openMenus[item.title] ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              
              {item.children && (
                <Collapse in={openMenus[item.title]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    {item.children.map((child) => (
                      <ListItem key={child.path} disablePadding>
                        <ListItemButton
                          onClick={() => handleNavigation(child.path)}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            py: 0.75,
                            backgroundColor: isPathActive(child.path)
                              ? alpha(theme.palette.primary.main, 0.12)
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemIcon 
                            sx={{ 
                              color: isPathActive(child.path) ? 'primary.main' : 'text.secondary',
                              minWidth: 36,
                            }}
                          >
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={child.title}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isPathActive(child.path) ? 600 : 400,
                              color: isPathActive(child.path) ? 'primary.main' : 'text.primary',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            Versión 1.0.0
          </Typography>
          <Typography variant="caption" color="text.secondary">
            © 2025 MiniMarket ML
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            {menuItems.find(item => item.path === location.pathname)?.title ||
             menuItems.flatMap(item => item.children || []).find(child => child.path === location.pathname)?.title ||
             'MiniMarket ML'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notificaciones">
              <IconButton onClick={handleNotifMenuOpen} sx={{ color: 'text.primary' }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Cuenta">
              <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '1rem',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
          
          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleNotifMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 320,
                maxHeight: 400,
                borderRadius: 2,
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Notificaciones</Typography>
            </Box>
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notif, index) => (
                <MenuItem key={index} onClick={handleNotifMenuClose}>
                  <Box>
                    <Typography variant="body2">{notif.message}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notif.time}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay notificaciones nuevas
                </Typography>
              </Box>
            )}
          </Menu>
          
          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleUserMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.username || 'Usuario'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || 'usuario@minimarket.com'}
              </Typography>
            </Box>
            <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              Mi Perfil
            </MenuItem>
            <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Configuración
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
              boxShadow: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;