import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuItemImage, uploadMenuItemVideo } from '../services/api';
import { ArrowLeft, Plus, Edit, Trash2, Upload, Save, X, Flame, Leaf, Clock } from 'lucide-react';
import Logo from './Logo';

function MenuManagement() {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        categoryId: 1,
        name: '',
        description: '',
        price: 0,
        isSpecialOffer: false,
        isAvailable: true,
        preparationTime: 15,
        spiciness: 0,
        isVegetarian: false,
        displayOrder: 0
    });

    useEffect(() => {
        loadMenuItems();
    }, []);

    const loadMenuItems = async () => {
        try {
            const response = await getMenuItems();
            setMenuItems(response.data);
        } catch (error) {
            console.error('Error loading menu items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateMenuItem(editingItem.menuItemId, formData);
            } else {
                await createMenuItem(formData);
            }
            loadMenuItems();
            resetForm();
            alert(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
        } catch (error) {
            console.error('Error saving menu item:', error);
            alert('Failed to save menu item');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            categoryId: item.categoryId,
            name: item.name,
            description: item.description || '',
            price: item.price,
            isSpecialOffer: item.isSpecialOffer,
            isAvailable: item.isAvailable,
            preparationTime: item.preparationTime,
            spiciness: item.spiciness,
            isVegetarian: item.isVegetarian,
            displayOrder: item.displayOrder
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await deleteMenuItem(id);
                loadMenuItems();
                alert('Item deleted successfully!');
            } catch (error) {
                console.error('Error deleting item:', error);
                alert('Failed to delete item');
            }
        }
    };

    const handleImageUpload = async (menuItemId, file) => {
        try {
            const response = await uploadMenuItemImage(menuItemId, file);
            loadMenuItems();
            alert(response.data.message || 'Image uploaded successfully!');
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.response?.data?.message || 'Failed to upload image');
        }
    };

    const handleVideoUpload = async (menuItemId, file) => {
        try {
            const response = await uploadMenuItemVideo(menuItemId, file);
            loadMenuItems();
            alert(response.data.message || 'Video uploaded successfully!');
        } catch (error) {
            console.error('Error uploading video:', error);
            alert(error.response?.data?.message || 'Failed to upload video');
        }
    };

    const resetForm = () => {
        setFormData({
            categoryId: 1,
            name: '',
            description: '',
            price: 0,
            isSpecialOffer: false,
            isAvailable: true,
            preparationTime: 15,
            spiciness: 0,
            isVegetarian: false,
            displayOrder: 0
        });
        setEditingItem(null);
        setShowForm(false);
    };

    const categories = [
        { id: 1, name: 'Dumplings' },
        { id: 2, name: 'Buns' },
        { id: 3, name: 'Noodles' },
        { id: 4, name: 'Soups' },
        { id: 5, name: 'Sides' },
        { id: 6, name: 'Beverages' }
    ];

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
                              
                            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                        >
                            <Plus size={20} className="mr-2" />
                            Add New Item
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">
                                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                                </h2>
                                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            name="categoryId"
                                            value={formData.categoryId}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Item Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Prep Time (min)
                                        </label>
                                        <input
                                            type="number"
                                            name="preparationTime"
                                            value={formData.preparationTime}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Spiciness (0-5)
                                        </label>
                                        <input
                                            type="number"
                                            name="spiciness"
                                            value={formData.spiciness}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="5"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Display Order
                                        </label>
                                        <input
                                            type="number"
                                            name="displayOrder"
                                            value={formData.displayOrder}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-6">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isSpecialOffer"
                                            checked={formData.isSpecialOffer}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Special Offer</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isVegetarian"
                                            checked={formData.isVegetarian}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Vegetarian</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isAvailable"
                                            checked={formData.isAvailable}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Available</span>
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center"
                                    >
                                        <Save size={20} className="mr-2" />
                                        {editingItem ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map(item => (
                        <div key={item.menuItemId} className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="h-48 bg-gray-200 relative">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl">🥟</div>
                                )}
                                {item.isSpecialOffer && (
                                    <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                        SPECIAL
                                    </span>
                                )}
                                <div className="absolute bottom-2 right-2 flex space-x-2">
                                    <label className="bg-white p-2 rounded-full cursor-pointer hover:bg-gray-100 shadow-md" title="Upload Image">
                                        <Upload size={16} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files[0]) {
                                                    handleImageUpload(item.menuItemId, e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                    <label className="bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 shadow-md" title="Upload Video">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                        </svg>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files[0]) {
                                                    handleVideoUpload(item.menuItemId, e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg">{item.name}</h3>
                                    {item.isSpecialOffer && (
                                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                                            SPECIAL
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-3 mb-3">
                                    {item.spiciness > 0 && (
                                        <div className="flex items-center text-red-500">
                                            <Flame size={16} />
                                            <span className="text-xs ml-1">×{item.spiciness}</span>
                                        </div>
                                    )}
                                    {item.isVegetarian && (
                                        <div className="flex items-center text-green-600">
                                            <Leaf size={16} />
                                        </div>
                                    )}
                                    <div className="flex items-center text-gray-500">
                                        <Clock size={16} />
                                        <span className="text-xs ml-1">{item.preparationTime}m</span>
                                    </div>
                                    {item.videoUrl && (
                                        <div className="flex items-center text-blue-500" title="Has video">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t">
                                    <span className="text-xl font-bold text-red-600">${item.price.toFixed(2)}</span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.menuItemId)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default MenuManagement;