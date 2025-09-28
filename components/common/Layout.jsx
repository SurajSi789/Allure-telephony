import React from 'react'
import SidePanel from './SidePanel.jsx'
import Header from './Header.jsx'

const Layout = ({ children }) => {
  
    return (
      <div className="min-h-screen bg-[#f4f5fa]">
        <Header />
        <SidePanel />
        <div className="ml-64 pt-20 p-6">
            {children}
        </div>
      </div>
    )
}
  
export default Layout
