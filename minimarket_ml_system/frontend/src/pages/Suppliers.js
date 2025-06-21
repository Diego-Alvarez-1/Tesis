// pages/Suppliers.js
import React, { useState, useEffect } from 'react';
import { suppliersAPI, showAlert } from '../services/api';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    is_active: ''
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    ruc: '',
    phone: '',
    email: '',
    address: '',
    is_active: true
  });

  useEffect(() => {
    loadSuppliers();
  }, [filters]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.getSuppliers(filters);
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      showAlert('Error cargando proveedores', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSupplierForm({
      name: '',
      ruc: '',
      phone: '',
      email: '',
      address: '',
      is_active: true
    });
    setEditingSupplier(null);
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setSupplierForm({
        name: supplier.name,
        ruc: supplier.ruc,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        is_active: supplier.is_active
      });
      setEditingSupplier(supplier);
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
      if (editingSupplier) {
        await suppliersAPI.updateSupplier(editingSupplier.id, supplierForm);
        showAlert('Proveedor actualizado exitosamente', 'success');
      } else {
        await suppliersAPI.createSupplier(supplierForm);
        showAlert('Proveedor creado exitosamente', 'success');
      }
      closeModal();
      loadSuppliers();
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      showAlert('Error guardando proveedor', 'danger');
    }
  };

  const handleDelete = async (supplier) => {
    if (window.confirm(`¿Está seguro de eliminar el proveedor "${supplier.name}"?`)) {
      try {
        await suppliersAPI.deleteSupplier(supplier.id);
        showAlert('Proveedor eliminado exitosamente', 'success');
        loadSuppliers();
      } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showAlert('Error eliminando proveedor', 'danger');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <h1>Gestión de Proveedores</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Nuevo Proveedor
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
              placeholder="Buscar por nombre, RUC..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
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
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="card">
        <h3>Proveedores ({suppliers.length})</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.ruc}</td>
                  <td>{supplier.phone || 'N/A'}</td>
                  <td>{supplier.email || 'N/A'}</td>
                  <td>{supplier.product_count || 0}</td>
                  <td>
                    <span className={`alert ${supplier.is_active ? 'alert-success' : 'alert-danger'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      {supplier.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => openModal(supplier)}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(supplier)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de proveedor */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>RUC *</label>
                <input
                  type="text"
                  className="form-control"
                  value={supplierForm.ruc}
                  onChange={(e) => setSupplierForm(prev => ({
                    ...prev,
                    ruc: e.target.value
                  }))}
                  maxLength="11"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm(prev => ({
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
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm(prev => ({
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
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm(prev => ({
                    ...prev,
                    address: e.target.value
                  }))}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={supplierForm.is_active}
                    onChange={(e) => setSupplierForm(prev => ({
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
                  {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;