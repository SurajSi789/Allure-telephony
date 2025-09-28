import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const SidePanel = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (showLogoutModal && event.key === 'Escape') {
        setShowLogoutModal(false)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [showLogoutModal])

  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { name: 'Compare Reports', icon: '⚖️', path: '/compare-reports' },
    { name: 'Download Reports', icon: '📄', path: '/report-generator' },
    { name: 'Logout', icon: '🚪', path: '/', isLogout: true },
  ]

  const handleNavigation = (path, isLogout = false) => {
    if (isLogout) {
      console.log('Showing logout modal')
      setShowLogoutModal(true)
    } else {
      navigate(path)
    }
  }

  const handleLogout = () => {
    // Clear the stored token
    localStorage.removeItem('token')
    // Navigate to login page
    navigate('/')
    // Close modal
    setShowLogoutModal(false)
  }

  const handleCancelLogout = () => {
    setShowLogoutModal(false)
  }

  return (
    <>
      <div className='fixed top-0 left-0 h-screen w-64 p-4 overflow-y-auto transition-all duration-300 pt-16'>
        
        {/* Navigation Menu */}
        <div className='w-full h-3/4 p-4'>
          <nav className='space-y-2'>
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path && !item.isLogout
              return (
                <div
                  key={index}
                  onClick={() => handleNavigation(item.path, item.isLogout)}
                  className={`flex items-center space-x-3 p-3 text-wrap rounded-lg cursor-pointer transition-colors duration-200 ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className='text-lg'>{item.icon}</span>
                  <span className='font-medium'>{item.name}</span>
                </div>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{background: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm Logout
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Are you sure you want to logout? You will need to login again to access the application.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelLogout}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SidePanel
