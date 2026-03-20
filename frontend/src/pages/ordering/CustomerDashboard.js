import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { getCategories, createOrder, getRecommendations, getNotifications } from '../services/api';
import { ShoppingCart, LogOut, Bell, Clock, Flame, Leaf, Star, Plus, Minus, User, X } from 'lucide-react';
import Logo from './Logo';

function CustomerDashboard() {
    const [categories, setCategories] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [cart, setCart] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // Control body scroll when modals are open
    useEffect(() => {
        const hasModalOpen = showCart || showNotifications || showVideoModal || showItemModal;

        if (hasModalOpen) {
            document.body.classList.add('body-no-scroll');
            document.documentElement.classList.add('modal-open');
        } else {
            document.body.classList.remove('body-no-scroll');
            document.documentElement.classList.remove('modal-open');
        }

        // Cleanup on component unmount
        return () => {
            document.body.classList.remove('body-no-scroll');
            document.documentElement.classList.remove('modal-open');
        };
    }, [showCart, showNotifications, showVideoModal, showItemModal]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [categoriesRes, recommendationsRes, notificationsRes] = await Promise.all([
                getCategories(),
                getRecommendations(),
                getNotifications()
            ]);
            setCategories(categoriesRes.data);
            setRecommendations(recommendationsRes.data);
            setNotifications(notificationsRes.data.filter(n => !n.isRead).slice(0, 5));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Cart functions
    const addToCart = (item) => {
        const existingItem = cart.find(cartItem => cartItem.menuItemId === item.menuItemId);
        if (existingItem) {
            setCart(cart.map(cartItem =>
                cartItem.menuItemId === item.menuItemId
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const updateQuantity = (menuItemId, delta) => {
        setCart(cart.map(item => {
            if (item.menuItemId === menuItemId) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setOrderLoading(true);
        try {
            const orderData = {
                items: cart.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity
                })),
                paymentMethod: 'Card'
            };

            await createOrder(orderData);
            alert('Order placed successfully! You will receive updates via SMS and in-app notifications.');
            setCart([]);
            setShowCart(false);
            loadData();
        } catch (error) {
            alert('Failed to place order. Please try again.');
            console.error('Order error:', error);
        } finally {
            setOrderLoading(false);
        }
    };

    // Modal functions
    const handlePlayVideo = (videoUrl) => {
        setSelectedVideo(videoUrl);
        setShowVideoModal(true);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setShowItemModal(true);
    };

    const handleCloseItemModal = () => {
        setShowItemModal(false);
        setSelectedItem(null);
    };

    const handleAddFromModal = () => {
        if (selectedItem) {
            addToCart(selectedItem);
            // Optional: close modal after adding to cart
            // handleCloseItemModal();
        }
    };

    const handleCloseVideoModal = () => {
        setShowVideoModal(false);
        setSelectedVideo(null);
    };

    const handleCloseCart = () => {
        setShowCart(false);
    };

    const handleCloseNotifications = () => {
        setShowNotifications(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🥟</div>
                    <p className="text-gray-600">Loading delicious dumplings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 CustomerDashboard">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Logo size="sm" />
                            <h1 className="text-2xl font-bold text-gray-900">DumplingNow</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-600 hover:text-gray-900"
                            >
                                <Bell size={24} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowCart(!showCart)}
                                className="relative p-2 text-gray-600 hover:text-gray-900"
                            >
                                <ShoppingCart size={24} />
                                {cart.length > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                            <Link
                                to="/profile"
                                className="p-2 text-gray-600 hover:text-gray-900"
                                title="My Profile"
                            >
                                <User size={24} />
                            </Link>
                            <div className="text-sm text-gray-600">
                                Hello, {user.firstName}!
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center text-gray-600 hover:text-red-600"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Video Modal */}
            {showVideoModal && selectedVideo && (
                <div className="modal-overlay video-modal-overlay" onClick={handleCloseVideoModal}>
                    <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="video-modal-header">
                            <h3 className="text-white text-xl font-bold">Video Preview</h3>
                            <button
                                onClick={handleCloseVideoModal}
                                className="video-modal-close"
                                aria-label="Close video"
                            >
                                ×
                            </button>
                        </div>
                        <video
                            controls
                            autoPlay
                            className="video-modal-video"
                            onError={(e) => {
                                console.error('Video playback error:', e);
                                alert('Error playing video. The video format may not be supported by your browser.');
                            }}
                        >
                            <source src={selectedVideo} />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}

            {/* Item Detail Modal */}
            {showItemModal && selectedItem && (
                <div className="modal-overlay item-modal-overlay" onClick={handleCloseItemModal}>
                    <div className="item-modal-content" onClick={(e) => e.stopPropagation()}>

                        {/* Header - Fixed at top */}
                        <div className="item-modal-header">
                            <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
                            <button
                                onClick={handleCloseItemModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-1"
                                aria-label="Close details"
                            >
                                ×
                            </button>
                        </div>

                        {/* Scrollable content area */}
                        <div className="item-modal-scroll-container">

                            {/* Image section - fixed height */}
                            <div className="item-modal-image-section">
                                {selectedItem.imageUrl ? (
                                    <img
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.name}
                                        className="item-modal-image"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-8xl">🥟</div>
                                )}
                                {selectedItem.isSpecialOffer && (
                                    <span className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                        SPECIAL OFFER
                                    </span>
                                )}
                            </div>

                            {/* Content body - scrollable */}
                            <div className="item-modal-body">
                                {/* Item Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedItem.name}</h2>
                                        <p className="text-xl font-bold text-red-600">${selectedItem.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                        {selectedItem.spiciness > 0 && (
                                            <div className="flex items-center text-red-500 bg-red-50 px-2 py-1 rounded">
                                                <Flame size={18} />
                                                <span className="text-sm ml-1">Spicy Level {selectedItem.spiciness}</span>
                                            </div>
                                        )}
                                        {selectedItem.isVegetarian && (
                                            <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded">
                                                <Leaf size={18} />
                                                <span className="text-sm ml-1">Vegetarian</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Preparation Time */}
                                <div className="flex items-center text-gray-600 mb-6">
                                    <Clock size={18} className="mr-2" />
                                    <span>Preparation time: {selectedItem.preparationTime} minutes</span>
                                </div>

                                {/* Description */}
                                <div className="mb-8">
                                    <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                                    <p className="text-gray-700 leading-relaxed">{selectedItem.description}</p>
                                </div>

                                {/* Ingredients */}
                                {selectedItem.ingredients && (
                                    <div className="mb-8">
                                        <h3 className="font-semibold text-gray-900 mb-3">Ingredients</h3>
                                        <p className="text-gray-700">{selectedItem.ingredients}</p>
                                    </div>
                                )}

                                {/* Allergens */}
                                {selectedItem.allergens && (
                                    <div className="mb-8">
                                        <h3 className="font-semibold text-gray-900 mb-3">Allergens</h3>
                                        <p className="text-gray-700 text-sm">{selectedItem.allergens}</p>
                                    </div>
                                )}

                                {/* Video Preview */}
                                {selectedItem.videoUrl && (
                                    <div className="mb-8">
                                        <h3 className="font-semibold text-gray-900 mb-3">How It's Made</h3>
                                        <button
                                            onClick={() => {
                                                handleCloseItemModal();
                                                handlePlayVideo(selectedItem.videoUrl);
                                            }}
                                            className="flex items-center justify-center w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                            </svg>
                                            Watch Preparation Video
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Fixed at bottom */}
                        <div className="item-modal-footer">
                            <button
                                onClick={handleAddFromModal}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center"
                            >
                                <Plus size={20} className="mr-2" />
                                Add to Cart - ${selectedItem.price.toFixed(2)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Cart Sidebar */}
            {showCart && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={handleCloseCart}
                        aria-hidden="true"
                    />
                    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Your Cart</h2>
                                <button
                                    onClick={handleCloseCart}
                                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                    aria-label="Close cart"
                                >
                                    ×
                                </button>
                            </div>

                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-6">
                                        {cart.map(item => (
                                            <div key={item.menuItemId} className="flex items-center justify-between border-b pb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{item.name}</h3>
                                                    <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.menuItemId, -1)}
                                                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.menuItemId, 1)}
                                                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <div className="ml-4 font-semibold">
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-4">
                                        <div className="flex justify-between text-xl font-bold mb-4">
                                            <span>Total:</span>
                                            <span>${getCartTotal().toFixed(2)}</span>
                                        </div>
                                        <button
                                            onClick={handleCheckout}
                                            disabled={orderLoading}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition"
                                        >
                                            {orderLoading ? 'Processing...' : 'Checkout'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Notifications Dropdown */}
            {showNotifications && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={handleCloseNotifications}
                        aria-hidden="true"
                    />
                    <div className="fixed right-4 top-16 bg-white rounded-lg shadow-xl w-80 p-4 z-40">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Notifications</h3>
                            <button
                                onClick={handleCloseNotifications}
                                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                                aria-label="Close notifications"
                            >
                                ×
                            </button>
                        </div>
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-sm">No new notifications</p>
                        ) : (
                            <div className="space-y-2">
                                {notifications.map(notif => (
                                    <div key={notif.notificationId} className="p-2 bg-gray-50 rounded text-sm">
                                        {notif.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Star className="text-yellow-500 mr-2" size={24} />
                            <h2 className="text-2xl font-bold">Recommended For You</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {recommendations.map(item => (
                                <MenuItemCard
                                    key={item.menuItemId}
                                    item={item}
                                    onAdd={addToCart}
                                    onPlayVideo={handlePlayVideo}
                                    onItemClick={handleItemClick}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Menu by Category */}
                {categories.map(category => (
                    <section key={category.categoryId} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{category.name}</h2>
                        {category.description && (
                            <p className="text-gray-600 mb-4">{category.description}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {category.menuItems.map(item => (
                                <MenuItemCard
                                    key={item.menuItemId}
                                    item={item}
                                    onAdd={addToCart}
                                    onPlayVideo={handlePlayVideo}
                                    onItemClick={handleItemClick}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}

// MenuItemCard component remains the same
function MenuItemCard({ item, onAdd, onPlayVideo, onItemClick }) {
    return (
        <div
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
            onClick={() => onItemClick(item)}
        >
            <div className="h-48 bg-gray-200 relative">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🥟</div>
                )}
                {item.isSpecialOffer && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        SPECIAL
                    </span>
                )}
                {item.videoUrl && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlayVideo(item.videoUrl);
                        }}
                        className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition"
                        title="Watch video"
                        aria-label="Play video"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </button>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center space-x-2 mb-3">
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
                        <span className="text-xs ml-1">{item.preparationTime} min</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-red-600">${item.price.toFixed(2)}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd(item);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center"
                    >
                        <Plus size={16} className="mr-1" />
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CustomerDashboard;