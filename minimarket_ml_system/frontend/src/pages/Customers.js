import React, { useState, useEffect, useCallback } from 'react';
import { customersAPI, formatCurrency, showAlert, handleApiError, safeString } from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    customer_type: '',
    is_active: '',
    has_credit: ''
  });

  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    document_type: 'DNI',
    document_number: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'REGULAR',
    credit_limit: '',
    birth_date: '',
    is_active: true
  });

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filtrar parámetros vacíos antes de enviar al backend
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
          cleanFilters[key] = filters[key];
        }
      });
      
      const response = await customersAPI.getCustomers(cleanFilters);
      const customersData = response.data;
      setCustomers(customersData.results || customersData || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      handleApiError(error, 'Error cargando clientes');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const resetForm = () => {
    setCustomerForm({
      first_name: '',
      last_name: '',
      document_type: 'DNI',
      document_number: '',
      phone: '',
      email: '',
      address: '',
      customer_type: 'REGULAR',
      credit_limit: '',
      birth_date: '',
      is_active: true
    });
    setEditingCustomer(null);
  };

  const openModal = (customer = null) => {
    if (customer) {
      setCustomerForm({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        document_type: customer.document_type || 'DNI',
        document_number: customer.document_number || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        customer_type: customer.customer_type || 'REGULAR',
        credit_limit: customer.credit_limit || '',
        birth_date: customer.birth_date || '',
        is_active: customer.is_active !== undefined ? customer.is_active : true
      });
      setEditingCustomer(customer);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validaciones
      if (!customerForm.first_name.trim()) {
        showAlert('El nombre es obligatorio', 'warning');
        return;
      }
      if (!customerForm.last_name.trim()) {
        showAlert('El apellido es obligatorio', 'warning');
        return;
      }
      if (!customerForm.document_number.trim()) {
        showAlert('El número de documento es obligatorio', 'warning');
        return;
      }

      // Validar longitud del documento
      if (customerForm.document_type === 'DNI' && customerForm.document_number.length !== 8) {
        showAlert('El DNI debe tener 8 dígitos', 'warning');
        return;
      }
      if (customerForm.document_type === 'RUC' && customerForm.document_number.length !== 11) {
        showAlert('El RUC debe tener 11 dígitos', 'warning');
        return;
      }

      // Preparar datos
      const formData = {
        ...customerForm,
        credit_limit: parseFloat(customerForm.credit_limit) || 0
      };

      if (editingCustomer) {
        await customersAPI.updateCustomer(editingCustomer.id, formData);
        showAlert('Cliente actualizado exitosamente', 'success');
      } else {
        await customersAPI.createCustomer(formData);
        showAlert('Cliente creado exitosamente', 'success');
      }
      closeModal();
      loadCustomers();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      handleApiError(error, 'Error guardando cliente');
    }
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`¿Está seguro de eliminar el cliente "${customer.full_name}"?`)) {
      try {
        await customersAPI.deleteCustomer(customer.id);
        showAlert('Cliente eliminado exitosamente', 'success');
        loadCustomers();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        handleApiError(error, 'Error eliminando cliente');
      }
    }
  };

  const viewSalesHistory = async (customer) => {
    try {
      setSelectedCustomer(customer);
      const response = await customersAPI.getCustomerSalesHistory(customer.id, { days: 90 });
      setSalesHistory(response.data.sales || []);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error cargando historial:', error);
      handleApiError(error, 'Error cargando historial de ventas');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Gestión de Clientes</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Nuevo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <h3>Filtros</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Buscar</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, documento..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Tipo de Cliente</label>
            <select
              className="form-control"
              value={filters.customer_type}
              onChange={(e) => setFilters(prev => ({ ...prev, customer_type: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="REGULAR">Regular</option>
              <option value="FREQUENT">Frecuente</option>
              <option value="VIP">VIP</option>
              <option value="WHOLESALE">Mayorista</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              className="form-control"
              value={filters.is_active}
              onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          <div className="form-group">
            <label>Con Crédito</label>
            <select
              className="form-control"
              value={filters.has_credit}
              onChange={(e) => setFilters(prev => ({ ...prev, has_credit: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="true">Con Crédito</option>
              <option value="false">Sin Crédito</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="card">
        <h3>Clientes ({customers.length})</h3>
        {customers.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Total Compras</th>
                  <th>Crédito Disponible</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>{safeString(customer.full_name)}</td>
                    <td>{customer.document_type}: {safeString(customer.document_number)}</td>
                    <td>{safeString(customer.phone, 'N/A')}</td>
                    <td>
                      <span className={`alert ${
                        customer.customer_type === 'VIP' ? 'alert-warning' :
                        customer.customer_type === 'FREQUENT' ? 'alert-info' :
                        'alert-secondary'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {safeString(customer.customer_type)}
                      </span>
                    </td>
                    <td>{formatCurrency(customer.total_purchases || 0)}</td>
                    <td>{formatCurrency(customer.available_credit || 0)}</td>
                    <td>
                      <span className={`alert ${customer.is_active ? 'alert-success' : 'alert-danger'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {customer.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => openModal(customer)}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-small btn-info"
                        onClick={() => viewSalesHistory(customer)}
                        style={{ backgroundColor: '#17a2b8', color: 'white' }}
                      >
                        Historial
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(customer)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            No se encontraron clientes con los filtros aplicados
          </div>
        )}
      </div>

      {/* Modal de cliente */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerForm.first_name}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      first_name: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerForm.last_name}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      last_name: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo Documento *</label>
                  <select
                    className="form-control"
                    value={customerForm.document_type}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      document_type: e.target.value
                    }))}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Número Documento *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerForm.document_number}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      document_number: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <textarea
                  className="form-control"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm(prev => ({
                    ...prev,
                    address: e.target.value
                  }))}
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Cliente</label>
                  <select
                    className="form-control"
                    value={customerForm.customer_type}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      customer_type: e.target.value
                    }))}
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="FREQUENT">Frecuente</option>
                    <option value="VIP">VIP</option>
                    <option value="WHOLESALE">Mayorista</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Límite de Crédito</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={customerForm.credit_limit}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      credit_limit: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Nacimiento</label>
                  <input
                    type="date"
                    className="form-control"
                    value={customerForm.birth_date}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      birth_date: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={customerForm.is_active}
                    onChange={(e) => setCustomerForm(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                  {' '}Activo
                </label>
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Ventas */}
      {showHistoryModal && selectedCustomer && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Historial de Ventas - {selectedCustomer.full_name}</h2>
              <span className="close" onClick={() => setShowHistoryModal(false)}>&times;</span>
            </div>
            
            <div className="grid grid-3">
              <div>
                <h4>Total Compras</h4>
                <p><strong>{formatCurrency(selectedCustomer.total_purchases || 0)}</strong></p>
              </div>
              <div>
                <h4>Cantidad Compras</h4>
                <p><strong>{selectedCustomer.purchase_count || 0}</strong></p>
              </div>
              <div>
                <h4>Promedio por Compra</h4>
                <p><strong>{formatCurrency(selectedCustomer.average_purchase || 0)}</strong></p>
              </div>
            </div>

            {salesHistory.length > 0 ? (
              <div>
                <h4>Últimas Ventas (90 días)</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Método Pago</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map(sale => (
                      <tr key={sale.id}>
                        <td>{safeString(sale.sale_number)}</td>
                        <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</td>
                        <td>{formatCurrency(sale.total || 0)}</td>
                        <td>{safeString(sale.payment_method)}</td>
                        <td>
                          <span className={`alert ${
                            sale.status === 'COMPLETED' ? 'alert-success' :
                            sale.status === 'PENDING' ? 'alert-warning' :
                            'alert-danger'
                          }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                            {safeString(sale.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No hay ventas registradas en los últimos 90 días</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;