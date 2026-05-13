import React, { useState, useMemo } from 'react';
import './VendorManagement.css';

const VendorManagement = () => {
  const [vendors, setVendors] = useState([
    { id: 1, name: 'TechSupply Co.', category: 'IT Equipment', paymentTerms: '30 days', status: 'active', rating: 4.8, invoices: 24, totalSpent: 125400 },
    { id: 2, name: 'Office Essentials', category: 'Office Supplies', paymentTerms: '45 days', status: 'active', rating: 4.5, invoices: 18, totalSpent: 45200 },
    { id: 3, name: 'Logistics Prime', category: 'Shipping', paymentTerms: '15 days', status: 'active', rating: 4.9, invoices: 42, totalSpent: 89600 },
    { id: 4, name: 'Creative Services Ltd', category: 'Design', paymentTerms: '30 days', status: 'inactive', rating: 4.2, invoices: 8, totalSpent: 28500 },
    { id: 5, name: 'Professional Staffing', category: 'HR Services', paymentTerms: '60 days', status: 'active', rating: 4.6, invoices: 12, totalSpent: 156800 },
    { id: 6, name: 'Cloud Infrastructure Inc', category: 'IT Services', paymentTerms: '30 days', status: 'active', rating: 4.7, invoices: 36, totalSpent: 234500 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newVendor, setNewVendor] = useState({ name: '', category: '', paymentTerms: '' });

  const filteredVendors = useMemo(() => {
    let filtered = vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          vendor.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort vendors
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'spent':
          return b.totalSpent - a.totalSpent;
        case 'rating':
          return b.rating - a.rating;
        case 'invoices':
          return b.invoices - a.invoices;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [vendors, searchQuery, filterStatus, sortBy]);

  const metrics = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.status === 'active').length,
    totalSpent: vendors.reduce((sum, v) => sum + v.totalSpent, 0),
    avgRating: (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)
  };

  const handleAddVendor = () => {
    if (newVendor.name.trim() && newVendor.category.trim()) {
      if (editingId) {
        setVendors(vendors.map(v => 
          v.id === editingId ? { ...v, ...newVendor } : v
        ));
        setEditingId(null);
      } else {
        setVendors([...vendors, {
          id: Math.max(...vendors.map(v => v.id), 0) + 1,
          ...newVendor,
          status: 'active',
          rating: 4.5,
          invoices: 0,
          totalSpent: 0
        }]);
      }
      setNewVendor({ name: '', category: '', paymentTerms: '' });
      setShowAddForm(false);
    }
  };

  const handleEditVendor = (vendor) => {
    setNewVendor({ name: vendor.name, category: vendor.category, paymentTerms: vendor.paymentTerms });
    setEditingId(vendor.id);
    setShowAddForm(true);
  };

  const handleDeleteVendor = (id) => {
    setVendors(vendors.filter(v => v.id !== id));
  };

  const toggleVendorStatus = (id) => {
    setVendors(vendors.map(v => 
      v.id === id ? { ...v, status: v.status === 'active' ? 'inactive' : 'active' } : v
    ));
  };

  return (
    <div className="vendor-management">
      <div className="vendor-container">
        {/* Header */}
        <div className="vendor-header">
          <div>
            <h1 className="vendor-title">Vendor Management</h1>
            <p className="vendor-subtitle">Manage and monitor all vendor relationships and performance</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <p className="metric-label">Total vendors</p>
            <p className="metric-value">{metrics.totalVendors}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Active vendors</p>
            <p className="metric-value metric-success">{metrics.activeVendors}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Total spent</p>
            <p className="metric-value">₹{(metrics.totalSpent / 100000).toFixed(1)}L</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Avg rating</p>
            <p className="metric-value">
              <span className="rating-badge">{metrics.avgRating}</span>
            </p>
          </div>
        </div>

        {/* Search & Filter & Controls */}
        <div className="controls-bar">
          <div className="search-container">
            <i className="ti ti-search search-icon"></i>
            <input 
              type="text"
              className="search-input"
              placeholder="Search vendors by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by name</option>
            <option value="spent">Sort by spent</option>
            <option value="rating">Sort by rating</option>
            <option value="invoices">Sort by invoices</option>
          </select>
          <button 
            className="add-button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
              setNewVendor({ name: '', category: '', paymentTerms: '' });
            }}
          >
            <i className="ti ti-plus"></i>
            Add vendor
          </button>
        </div>

        {/* Add/Edit Vendor Form */}
        {showAddForm && (
          <div className="add-vendor-form">
            <h3>{editingId ? 'Edit vendor' : 'Add new vendor'}</h3>
            <div className="form-grid">
              <input 
                type="text"
                className="form-input"
                placeholder="Vendor name"
                value={newVendor.name}
                onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
              />
              <input 
                type="text"
                className="form-input"
                placeholder="Category"
                value={newVendor.category}
                onChange={(e) => setNewVendor({...newVendor, category: e.target.value})}
              />
              <input 
                type="text"
                className="form-input"
                placeholder="Payment terms"
                value={newVendor.paymentTerms}
                onChange={(e) => setNewVendor({...newVendor, paymentTerms: e.target.value})}
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleAddVendor}>
                {editingId ? 'Update vendor' : 'Add vendor'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setNewVendor({ name: '', category: '', paymentTerms: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Vendors Table */}
        {filteredVendors.length > 0 ? (
          <div className="vendors-table-container">
            <table className="vendors-table">
              <thead>
                <tr>
                  <th>Vendor name</th>
                  <th>Category</th>
                  <th>Payment terms</th>
                  <th>Rating</th>
                  <th>Total spent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="vendor-row">
                    <td className="vendor-name-cell">
                      <div className="vendor-name">{vendor.name}</div>
                      <div className="vendor-meta">{vendor.invoices} invoices</div>
                    </td>
                    <td className="vendor-category">{vendor.category}</td>
                    <td className="vendor-terms">{vendor.paymentTerms}</td>
                    <td className="vendor-rating">
                      <span className="rating-pill">{vendor.rating}</span>
                    </td>
                    <td className="vendor-spent">₹{(vendor.totalSpent / 1000).toFixed(0)}K</td>
                    <td className="vendor-status">
                      <span className={`status-badge ${vendor.status}`}>
                        {vendor.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="vendor-actions">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEditVendor(vendor)}
                        title="Edit vendor"
                      >
                        <i className="ti ti-edit"></i>
                      </button>
                      <button 
                        className="action-btn toggle-btn"
                        onClick={() => toggleVendorStatus(vendor.id)}
                        title={`Toggle to ${vendor.status === 'active' ? 'inactive' : 'active'}`}
                      >
                        <i className={`ti ${vendor.status === 'active' ? 'ti-circle-check' : 'ti-circle'}`}></i>
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteVendor(vendor.id)}
                        title="Delete vendor"
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="ti ti-inbox"></i>
            <p>No vendors found matching your search</p>
          </div>
        )}

        {/* Results Summary */}
        <div className="results-summary">
          Showing {filteredVendors.length} of {vendors.length} vendors
        </div>
      </div>
    </div>
  );
};

export default VendorManagement;