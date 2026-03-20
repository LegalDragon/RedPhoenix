import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, updateOrderStatus } from '../services/api';
import { ArrowLeft, Clock, CheckCircle, XCircle, Package, Truck, RefreshCw } from 'lucide-react';
import Logo from './Logo';

function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadOrders();
    // Refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const response = await getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      loadOrders();
      alert(`Order status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Preparing': 'bg-purple-100 text-purple-800',
      'Ready': 'bg-green-100 text-green-800',
      'Completed': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock size={20} />;
      case 'Confirmed':
      case 'Preparing':
        return <Package size={20} />;
      case 'Ready':
        return <Truck size={20} />;
      case 'Completed':
        return <CheckCircle size={20} />;
      case 'Cancelled':
        return <XCircle size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="mr-4 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={24} />
              </Link>

                <Logo size="sm" />
                
              <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            </div>
            <button
              onClick={loadOrders}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center"
            >
              <RefreshCw size={20} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Filter */}
        <div className="mb-6 flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filterStatus === 'all' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Orders ({orders.length})
          </button>
          {['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(status => {
            const count = orders.filter(o => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.orderId} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold">Order #{order.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-2">{order.status}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Customer:</strong> {order.customer?.firstName} {order.customer?.lastName}</p>
                      <p><strong>Email:</strong> {order.customer?.email}</p>
                      {order.customer?.phoneNumber && (
                        <p><strong>Phone:</strong> {order.customer?.phoneNumber}</p>
                      )}
                      <p><strong>Order Time:</strong> {new Date(order.orderDate).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map(item => (
                      <div key={item.orderItemId} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.menuItemName}</span>
                        <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.specialInstructions && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-semibold mb-2">Special Instructions:</h4>
                    <p className="text-sm text-gray-600">{order.specialInstructions}</p>
                  </div>
                )}

                {/* Status Actions */}
                {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Update Status:</h4>
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(order.orderId, 'Confirmed')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Confirm Order
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(order.orderId, 'Cancelled')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}
                      {order.status === 'Confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(order.orderId, 'Preparing')}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => handleStatusUpdate(order.orderId, 'Ready')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Mark as Ready
                        </button>
                      )}
                      {order.status === 'Ready' && (
                        <button
                          onClick={() => handleStatusUpdate(order.orderId, 'Completed')}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Complete Order
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default OrderManagement;
