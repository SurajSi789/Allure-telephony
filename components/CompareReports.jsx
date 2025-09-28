import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
)

/**
 * CompareReports Component
 * 
 * Provides a comprehensive comparison interface between two Allure test reports.
 * Features:
 * - Dual report selection dropdowns
 * - Visual comparison charts (Bar, Doughnut, Line)
 * - Detailed statistics comparison
 * - Test status breakdown analysis
 * - Performance metrics comparison
 */
const CompareReports = () => {
  const [availableReports, setAvailableReports] = useState([])
  const [selectedReport1, setSelectedReport1] = useState('')
  const [selectedReport2, setSelectedReport2] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [comparisonData, setComparisonData] = useState(null)

  // Fetch available reports on component mount
  useEffect(() => {
    fetchAvailableReports()
  }, [])

  const fetchAvailableReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('https://allure-telephony.onrender.com/api/reports')
      
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

  const generateComparison = () => {
    const report1 = availableReports.find(r => r.runId === selectedReport1)
    const report2 = availableReports.find(r => r.runId === selectedReport2)
    
    if (!report1 || !report2) return

    const comparison = {
      report1: {
        name: report1.runId,
        stats: report1.summary?.statistic || {},
        totalFiles: report1.summary?.totalFiles || 0,
        time: report1.summary?.time || {}
      },
      report2: {
        name: report2.runId,
        stats: report2.summary?.statistic || {},
        totalFiles: report2.summary?.totalFiles || 0,
        time: report2.summary?.time || {}
      }
    }

    // Calculate raw differences: Report2 - Report1
    // Positive values mean Report2 has more, Negative values mean Report2 has fewer
    comparison.differences = {
      total: comparison.report2.stats.total - comparison.report1.stats.total,
      passed: comparison.report2.stats.passed - comparison.report1.stats.passed,
      failed: comparison.report2.stats.failed - comparison.report1.stats.failed,
      broken: comparison.report2.stats.broken - comparison.report1.stats.broken,
      skipped: comparison.report2.stats.skipped - comparison.report1.stats.skipped,
      files: comparison.report2.totalFiles - comparison.report1.totalFiles
    }

    // Calculate percentages
    comparison.percentages = {
      report1: {
        passed: ((comparison.report1.stats.passed / comparison.report1.stats.total) * 100) || 0,
        failed: ((comparison.report1.stats.failed / comparison.report1.stats.total) * 100) || 0,
        broken: ((comparison.report1.stats.broken / comparison.report1.stats.total) * 100) || 0,
        skipped: ((comparison.report1.stats.skipped / comparison.report1.stats.total) * 100) || 0
      },
      report2: {
        passed: ((comparison.report2.stats.passed / comparison.report2.stats.total) * 100) || 0,
        failed: ((comparison.report2.stats.failed / comparison.report2.stats.total) * 100) || 0,
        broken: ((comparison.report2.stats.broken / comparison.report2.stats.total) * 100) || 0,
        skipped: ((comparison.report2.stats.skipped / comparison.report2.stats.total) * 100) || 0
      }
    }

    setComparisonData(comparison)
  }

  // Update comparison when both reports are selected
  useEffect(() => {
    if (selectedReport1 && selectedReport2 && availableReports.length > 0) {
      generateComparison()
    } else {
      setComparisonData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport1, selectedReport2, availableReports])

  // Chart configurations
  const createBarChartData = () => {
    if (!comparisonData) return null

    return {
      labels: ['Total', 'Passed', 'Failed', 'Broken', 'Skipped'],
      datasets: [
        {
          label: comparisonData.report1.name,
          data: [
            comparisonData.report1.stats.total,
            comparisonData.report1.stats.passed,
            comparisonData.report1.stats.failed,
            comparisonData.report1.stats.broken,
            comparisonData.report1.stats.skipped
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: comparisonData.report2.name,
          data: [
            comparisonData.report2.stats.total,
            comparisonData.report2.stats.passed,
            comparisonData.report2.stats.failed,
            comparisonData.report2.stats.broken,
            comparisonData.report2.stats.skipped
          ],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }
      ]
    }
  }

  const createDoughnutChartData = (reportData, title) => {
    if (!reportData) return null

    return {
      labels: ['Passed', 'Failed', 'Broken', 'Skipped'],
      datasets: [
        {
          label: title,
          data: [
            reportData.stats.passed,
            reportData.stats.failed,
            reportData.stats.broken,
            reportData.stats.skipped
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(156, 163, 175, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(156, 163, 175, 1)'
          ],
          borderWidth: 2
        }
      ]
    }
  }

  const createSuccessRateLineChart = () => {
    if (!comparisonData) return null

    return {
      labels: [comparisonData.report1.name, comparisonData.report2.name],
      datasets: [
        {
          label: 'Success Rate (%)',
          data: [
            comparisonData.percentages.report1.passed,
            comparisonData.percentages.report2.passed
          ],
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Failure Rate (%)',
          data: [
            comparisonData.percentages.report1.failed,
            comparisonData.percentages.report2.failed
          ],
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Test Results Comparison'
      }
    }
  }

  const getDifferenceColor = (value, isNegativeGood = false) => {
    if (value === 0) return 'text-gray-600'
    
    if (isNegativeGood) {
      // For failed/broken/skipped: positive means more bad tests (worse), negative means fewer bad tests (better)
      if (value > 0) return 'text-red-600'   // More bad tests = worse
      if (value < 0) return 'text-green-600' // Fewer bad tests = better
    } else {
      // For total/passed: positive means more good tests (better), negative means fewer good tests (worse)
      if (value > 0) return 'text-green-600' // More good tests = better
      if (value < 0) return 'text-red-600'   // Fewer good tests = worse
    }
    return 'text-gray-600'
  }

  const getDifferenceIcon = (value, isNegativeGood = false) => {
    if (value === 0) return ''  // Don't show icon for zero
    
    if (isNegativeGood) {
      // For failed/broken/skipped: positive means more bad tests (worse), negative means fewer bad tests (better)
      if (value > 0) return '↘' // More bad tests = regression
      if (value < 0) return '↗' // Fewer bad tests = improvement
    } else {
      // For total/passed: positive means more good tests (better), negative means fewer good tests (worse)
      if (value > 0) return '↗' // More good tests = improvement
      if (value < 0) return '↘' // Fewer good tests = regression
    }
    return ''
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Compare Test Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              Select two reports to compare test results and analyze differences
            </p>
          </div>

          {/* Report Selection */}
          <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report 1 Selection */}
              <div>
                <label htmlFor="report1-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select First Report
                </label>
                <select
                  id="report1-select"
                  value={selectedReport1}
                  onChange={(e) => setSelectedReport1(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Choose first report...</option>
                  {availableReports.map((report, index) => (
                    <option key={index} value={report.runId} disabled={report.runId === selectedReport2}>
                      {report.runId} ({report.summary?.statistic?.total || 0} tests)
                    </option>
                  ))}
                </select>
              </div>

              {/* Report 2 Selection */}
              <div>
                <label htmlFor="report2-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Second Report
                </label>
                <select
                  id="report2-select"
                  value={selectedReport2}
                  onChange={(e) => setSelectedReport2(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Choose second report...</option>
                  {availableReports.map((report, index) => (
                    <option key={index} value={report.runId} disabled={report.runId === selectedReport1}>
                      {report.runId} ({report.summary?.statistic?.total || 0} tests)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading reports...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mx-6 my-4 bg-red-50 border border-red-200 rounded-md p-4">
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

          {/* Comparison Results */}
          {comparisonData && (
            <div className="px-6 py-6 space-y-8">

              {/* Quick Stats Comparison */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonData.differences.total}
                    <span className={`text-sm ml-1 ${getDifferenceColor(comparisonData.differences.total, false)}`}>
                      {getDifferenceIcon(comparisonData.differences.total, false)}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">Total Tests Diff</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonData.differences.passed}
                    <span className={`text-sm ml-1 ${getDifferenceColor(comparisonData.differences.passed, false)}`}>
                      {getDifferenceIcon(comparisonData.differences.passed, false)}
                    </span>
                  </div>
                  <div className="text-sm text-green-700">Passed Tests Diff</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonData.differences.failed}
                    <span className={`text-sm ml-1 ${getDifferenceColor(comparisonData.differences.failed, true)}`}>
                      {getDifferenceIcon(comparisonData.differences.failed, true)}
                    </span>
                  </div>
                  <div className="text-sm text-red-700">Failed Tests Diff</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {comparisonData.differences.broken}
                    <span className={`text-sm ml-1 ${getDifferenceColor(comparisonData.differences.broken, true)}`}>
                      {getDifferenceIcon(comparisonData.differences.broken, true)}
                    </span>
                  </div>
                  <div className="text-sm text-yellow-700">Broken Tests Diff</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {comparisonData.differences.skipped}
                    <span className={`text-sm ml-1 ${getDifferenceColor(comparisonData.differences.skipped, true)}`}>
                      {getDifferenceIcon(comparisonData.differences.skipped, true)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">Skipped Tests Diff</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Count Comparison</h3>
                  {createBarChartData() && (
                    <Bar data={createBarChartData()} options={chartOptions} />
                  )}
                </div>

                {/* Success Rate Line Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Success vs Failure Rate</h3>
                  {createSuccessRateLineChart() && (
                    <Line data={createSuccessRateLineChart()} options={chartOptions} />
                  )}
                </div>

                {/* Report 1 Doughnut */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{comparisonData.report1.name}</h3>
                  {createDoughnutChartData(comparisonData.report1, comparisonData.report1.name) && (
                    <Doughnut data={createDoughnutChartData(comparisonData.report1, comparisonData.report1.name)} />
                  )}
                </div>

                {/* Report 2 Doughnut */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{comparisonData.report2.name}</h3>
                  {createDoughnutChartData(comparisonData.report2, comparisonData.report2.name) && (
                    <Doughnut data={createDoughnutChartData(comparisonData.report2, comparisonData.report2.name)} />
                  )}
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Detailed Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{comparisonData.report1.name}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{comparisonData.report2.name}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        { key: 'total', label: 'Total Tests', isNegativeGood: false },
                        { key: 'passed', label: 'Passed Tests', isNegativeGood: false },
                        { key: 'failed', label: 'Failed Tests', isNegativeGood: true },
                        { key: 'broken', label: 'Broken Tests', isNegativeGood: true },
                        { key: 'skipped', label: 'Skipped Tests', isNegativeGood: true }
                      ].map((metric) => {
                        const value1 = comparisonData.report1.stats[metric.key] || 0
                        const value2 = comparisonData.report2.stats[metric.key] || 0
                        
                        // Calculate raw difference: Second Report - First Report
                        const diff = value2 - value1
                        
                        // Calculate percentage change based on first report as baseline
                        let percentChange
                        if (value1 > 0) {
                          percentChange = ((diff / value1) * 100).toFixed(1)
                        } else if (value2 > 0 && value1 === 0) {
                          // When first report has 0 and second has more
                          percentChange = (value2 * 100).toFixed(1) // Show as 400% for 0->4 change
                        } else {
                          percentChange = 'N/A'
                        }
                        
                        return (
                          <tr key={metric.key}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{metric.label}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{value1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{value2}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDifferenceColor(diff, metric.isNegativeGood)}`}>
                              {diff !== 0 && (diff > 0 ? '+' : '')}{diff} {getDifferenceIcon(diff, metric.isNegativeGood)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDifferenceColor(diff, metric.isNegativeGood)}`}>
                              {percentChange !== 'N/A' && diff !== 0 ? `${diff > 0 ? '+' : ''}${percentChange}%` : percentChange}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !comparisonData && !error && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comparison selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select two different reports above to compare their test results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompareReports
