import React, { useState, useEffect } from 'react'

/**
 * ReportGenerator Component
 * 
 * Provides a user interface for downloading Allure result folders from S3.
 * Features:
 * - List of available Allure result folders
 * - Download buttons for each folder
 * - Instructions for running Allure reports locally
 * - Report statistics and summary information
 */
const ReportGenerator = () => {
  const [availableReports, setAvailableReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingReports, setDownloadingReports] = useState(new Set())

  // Fetch available reports on component mount
  useEffect(() => {
    fetchAvailableReports()
  }, [])

  const fetchAvailableReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('http://localhost:5003/api/reports')
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }
      
      const data = await response.json()
      setAvailableReports(data.reports || [])
    } catch (err) {
      setError('Failed to load available reports: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = async (runId) => {
    setDownloadingReports(prev => new Set(prev).add(runId))
    setError('')

    try {
      console.log(`Starting download for ${runId}...`)
      
      const response = await fetch(`http://localhost:5003/api/download-report/${encodeURIComponent(runId)}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to download report: ${response.status} ${errorText}`)
      }
      
      // Check if we have content-length for progress tracking
      const contentLength = response.headers.get('content-length')
      const total = parseInt(contentLength, 10)
      let loaded = 0
      
      // Create a readable stream to track progress
      const reader = response.body.getReader()
      const chunks = []
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        loaded += value.length
        
        if (total) {
          const progress = Math.round((loaded / total) * 100)
          console.log(`Download progress for ${runId}: ${progress}%`)
        }
      }
      
      // Combine chunks into blob
      const blob = new Blob(chunks, { type: 'application/zip' })
      
      // Create a temporary link to download the zip file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${runId}.zip`
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log(`Download completed for ${runId}`)
      
    } catch (err) {
      console.error(`Download error for ${runId}:`, err)
      setError(`Failed to download ${runId}: ${err.message}`)
    } finally {
      setDownloadingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(runId)
        return newSet
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Allure Results Download</h1>
            <p className="mt-1 text-sm text-gray-600">
              Download Allure result folders to generate reports locally on your machine
            </p>
          </div>

          {/* Instructions */}
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">📋 How to Generate Reports Locally</h2>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Click the <strong>Download ZIP</strong> button below to get the result folder</li>
              <li>Extract the ZIP file to your local machine</li>
              <li>Install Allure CLI: <code className="bg-blue-100 px-1 rounded">npm install -g allure-commandline</code></li>
              <li>Generate report: <code className="bg-blue-100 px-1 rounded">allure generate [extracted-folder] -o allure-report</code></li>
              <li>Open report: <code className="bg-blue-100 px-1 rounded">allure open allure-report</code></li>
            </ol>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading available reports...</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reports List */}
            {!isLoading && availableReports.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Available Allure Result Folders</h3>
                <div className="grid gap-4">
                  {availableReports.map((report, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{report.runId}</h4>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-500">Total Tests:</span>
                              <span className="ml-1 text-gray-900">{report.summary?.statistic?.total || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-green-600">Passed:</span>
                              <span className="ml-1 text-green-700">{report.summary?.statistic?.passed || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-red-600">Failed:</span>
                              <span className="ml-1 text-red-700">{report.summary?.statistic?.failed || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-yellow-600">Broken:</span>
                              <span className="ml-1 text-yellow-700">{report.summary?.statistic?.broken || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Skipped:</span>
                              <span className="ml-1 text-gray-700">{report.summary?.statistic?.skipped || 0}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Files: {report.summary?.totalFiles || 0}
                          </div>
                        </div>
                        <div className="ml-6">
                          <button
                            onClick={() => downloadReport(report.runId)}
                            disabled={downloadingReports.has(report.runId)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                              downloadingReports.has(report.runId)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            }`}
                          >
                            {downloadingReports.has(report.runId) ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Downloading...
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download ZIP
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && availableReports.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports available</h3>
                <p className="mt-1 text-sm text-gray-500">No Allure result folders found in S3.</p>
              </div>
            )}

            {/* Summary Statistics */}
            {!isLoading && availableReports.length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{availableReports.length}</div>
                    <div className="text-sm text-blue-700">Total Report Folders</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {availableReports.reduce((sum, report) => sum + (report.summary?.statistic?.total || 0), 0)}
                    </div>
                    <div className="text-sm text-green-700">Total Tests</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {availableReports.reduce((sum, report) => sum + (report.summary?.totalFiles || 0), 0)}
                    </div>
                    <div className="text-sm text-purple-700">Total Result Files</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator
