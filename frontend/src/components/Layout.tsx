import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const customerNav = [
    { path: '/', label: t('nav.dashboard') },
    { path: '/upload', label: t('nav.uploadReceipt') },
    { path: '/meals', label: t('nav.myMeals') },
    { path: '/rewards', label: t('nav.rewards') },
    { path: '/notifications', label: t('nav.notifications') },
    { path: '/profile', label: t('nav.myProfile') },
  ];

  const adminNav = [
    { path: '/admin', label: t('nav.adminDashboard') },
    { path: '/admin/users', label: t('nav.adminUsers') },
    { path: '/admin/rewards', label: t('nav.adminRewards') },
    { path: '/admin/sms', label: t('nav.smsBroadcast') },
    { path: '/admin/scan-phones', label: t('nav.scanPhones') },
  ];

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-2">🍣</span>
            <div>
              <h1 className="text-xl font-bold text-white">USushi</h1>
              <p className="text-xs text-gray-400">{t('common.loyaltyRewards')}</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Customer Nav */}
          <p className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">{t('nav.menu')}</p>
          {customerNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={closeSidebar}
              className={({ isActive: active }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sushi-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* Admin Nav */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider px-4">{t('nav.admin')}</p>
              </div>
              {adminNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={closeSidebar}
                  className={({ isActive: active }) =>
                    `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-sushi-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Language switcher + User info */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          <div className="flex justify-center">
            <LanguageSwitcher className="border-gray-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName || (user?.phone ? formatPhone(user.phone) : t('common.user'))}
              </p>
              <p className="text-xs text-gray-400">
                {user?.role}{user?.displayName && user?.phone ? ` · ${formatPhone(user.phone)}` : ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <header className="lg:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <span className="text-xl mr-1">🍣</span>
            <span className="text-lg font-bold text-white">USushi</span>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
