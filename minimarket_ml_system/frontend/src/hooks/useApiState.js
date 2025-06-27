// src/hooks/useApiState.js
import { useState, useCallback } from 'react';
import { showAlert } from '../services/api';

/**
 * Hook personalizado para manejar estados de API de forma consistente
 */
export const useApiState = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para ejecutar llamadas a API con manejo de errores
  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      loadingMessage = null,
      successMessage = null,
      errorMessage = 'Error en la operación',
      showSuccessAlert = true,
      showErrorAlert = true,
      onSuccess = null,
      onError = null,
      normalize = (data) => data
    } = options;

    try {
      setLoading(true);
      setError(null);

      if (loadingMessage) {
        showAlert(loadingMessage, 'info');
      }

      const response = await apiCall();
      const normalizedData = normalize(response.data);
      
      setData(normalizedData);

      if (successMessage && showSuccessAlert) {
        showAlert(successMessage, 'success');
      }

      if (onSuccess) {
        onSuccess(normalizedData);
      }

      return normalizedData;

    } catch (err) {
      console.error('API Error:', err);
      
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      err.message || 
                      errorMessage;
      
      setError(errorMsg);

      if (showErrorAlert) {
        showAlert(errorMsg, 'danger');
      }

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para resetear el estado
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  // Función para actualizar datos sin hacer llamada a API
  const updateData = useCallback((newData) => {
    setData(newData);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    updateData,
    setData,
    setLoading,
    setError
  };
};

/**
 * Hook específico para listas con paginación
 */
export const useApiList = (initialData = []) => {
  const [items, setItems] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page_size: 20
  });

  const loadItems = useCallback(async (apiCall, options = {}) => {
    const {
      append = false,
      normalize = (item) => item,
      showErrors = true
    } = options;

    try {
      setLoading(true);
      setError(null);

      const response = await apiCall();
      const data = response.data;

      // Determinar si es respuesta paginada o array simple
      const results = data.results || data;
      const normalizedItems = Array.isArray(results) 
        ? results.map(normalize)
        : [];

      if (append) {
        setItems(prev => [...prev, ...normalizedItems]);
      } else {
        setItems(normalizedItems);
      }

      // Actualizar paginación si existe
      if (data.count !== undefined) {
        setPagination({
          count: data.count || 0,
          next: data.next || null,
          previous: data.previous || null,
          page_size: data.page_size || 20
        });
      }

      return normalizedItems;

    } catch (err) {
      console.error('API List Error:', err);
      
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      err.message || 
                      'Error cargando datos';
      
      setError(errorMsg);

      if (showErrors) {
        showAlert(errorMsg, 'danger');
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback((item, normalize = (item) => item) => {
    const normalizedItem = normalize(item);
    setItems(prev => [normalizedItem, ...prev]);
  }, []);

  const updateItem = useCallback((id, updatedItem, normalize = (item) => item) => {
    const normalizedItem = normalize(updatedItem);
    setItems(prev => prev.map(item => 
      item.id === id ? normalizedItem : item
    ));
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const reset = useCallback(() => {
    setItems(initialData);
    setError(null);
    setLoading(false);
    setPagination({
      count: 0,
      next: null,
      previous: null,
      page_size: 20
    });
  }, [initialData]);

  return {
    items,
    loading,
    error,
    pagination,
    loadItems,
    addItem,
    updateItem,
    removeItem,
    reset,
    setItems,
    setLoading,
    setError
  };
};

export default useApiState;