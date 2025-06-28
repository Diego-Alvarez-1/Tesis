import React, { useState, useEffect, useCallback } from 'react';
import { categoriesAPI, showAlert, handleApiError, safeString } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    is_active: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true
  });

const loadCategories = useCallback(async () => {
  try {
    setLoading(true);
    
    // CORRECCIÓN: Enviar filtros directamente
    console.log('📂 Filtros de categorías:', filters);
    const response = await categoriesAPI.getCategories(filters);
    const categoriesData = response.data;
    setCategories(categoriesData.results || categoriesData || []);
  } catch (error) {
    console.error('Error cargando categorías:', error);
    handleApiError(error, 'Error cargando categorías');
    setCategories([]);
  } finally {
    setLoading(false);
  }
}, [filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      is_active: true
    });
    setEditingCategory(null);
  };

  const openModal = (category = null) => {
    if (category) {
      setCategoryForm({
        name: category.name || '',
        description: category.description || '',
        is_active: category.is_active !== undefined ? category.is_active : true
      });
      setEditingCategory(category);
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
      if (!categoryForm.name.trim()) {
        showAlert('El nombre de la categoría es obligatorio', 'warning');
        return;
      }

      if (editingCategory) {
        await categoriesAPI.updateCategory(editingCategory.id, categoryForm);
        showAlert('Categoría actualizada exitosamente', 'success');
      } else {
        await categoriesAPI.createCategory(categoryForm);
        showAlert('Categoría creada exitosamente', 'success');
      }
      closeModal();
      loadCategories();
    } catch (error) {
      console.error('Error guardando categoría:', error);
      handleApiError(error, 'Error guardando categoría');
    }
  };

  const handleDelete = async (category) => {
    if (window.confirm(`¿Está seguro de eliminar la categoría "${category.name}"?`)) {
      try {
        await categoriesAPI.deleteCategory(category.id);
        showAlert('Categoría eliminada exitosamente', 'success');
        loadCategories();
      } catch (error) {
        console.error('Error eliminando categoría:', error);
        handleApiError(error, 'Error eliminando categoría');
      }
    }
  };

  const viewProducts = async (category) => {
    try {
      const response = await categoriesAPI.getCategoryProducts(category.id);
      const products = response.data.products || [];
      
      if (products.length > 0) {
        window.location.href = `/products?category=${category.id}`;
      } else {
        showAlert('Esta categoría no tiene productos', 'info');
      }
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      handleApiError(error, 'Error obteniendo productos de la categoría');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1>Gestión de Categorías</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Nueva Categoría
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
              placeholder="Buscar por nombre..."
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
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de categorías */}
      <div className="card">
        <h3>Categorías ({categories.length})</h3>
        {categories.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id}>
                    <td>{safeString(category.name)}</td>
                    <td>{safeString(category.description, 'Sin descripción')}</td>
                    <td>{category.product_count || 0}</td>
                    <td>
                      <span className={`alert ${category.is_active ? 'alert-success' : 'alert-danger'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {category.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>{category.created_at ? new Date(category.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => openModal(category)}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-small btn-info"
                        onClick={() => viewProducts(category)}
                        style={{ backgroundColor: '#17a2b8', color: 'white' }}
                      >
                        Ver Productos
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(category)}
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
            No se encontraron categorías con los filtros aplicados
          </div>
        )}
      </div>

      {/* Modal de categoría */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                  {' '}Activa
                </label>
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Actualizar' : 'Crear'} Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;