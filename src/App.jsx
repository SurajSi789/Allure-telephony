import './App.css'
import LoginPage from '../components/LoginPage'
import Dashboard from '../components/Dashboard'
import ReportGenerator from '../components/ReportGenerator'
import CompareReports from '../components/CompareReports'
import AllureViewer from '../components/AllureViewer'
import Layout from '../components/common/Layout'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { ReportsProvider } from './contexts/ReportsContext'

function App() {
  console.log('App component rendering...')
  console.log('Current URL:', window.location.href)
  
  return (
    <ReportsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/test" element={<div style={{color: 'red', fontSize: '24px'}}>TEST ROUTE WORKING!</div>} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Layout><Dashboard/></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/compare-reports" 
            element={<ProtectedRoute><Layout><CompareReports/></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/report-generator" 
            element={<ProtectedRoute><Layout><ReportGenerator/></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/allure-viewer/:runId?" 
            element={<ProtectedRoute><AllureViewer/></ProtectedRoute>} 
          />
        </Routes>
      </BrowserRouter>
    </ReportsProvider>
  );
}

export default App
