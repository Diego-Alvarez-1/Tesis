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
  InputAdornment,
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
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  Person,
  Phone,
  Email,
  ShoppingBag,
  AttachMoney,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  Star,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { customerAPI } from '../services/api';
import { useSnackbar } from 'notistack';

const CustomerCard = ({ customer, onEdit, onDelete, onViewHistory }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getCustomerTypeInfo = (type) => {
    switch (type) {
      case 'VIP':
        return { color: 'primary', icon: <Star />, label: 'VIP' };
      case 'FREQUENT':
        return { color: 'success', icon: <TrendingUp />, label: 'Frecuente' };
      case 'WHOLESALE':
        return { color: 'info', icon: <ShoppingBag />, label: 'Mayorista' };
      default:
        return { color: 'default', icon: <Person />, label: 'Regular' };
    }
  };

  const customerTypeInfo = getCustomerTypeInfo(customer.customer_type);

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',