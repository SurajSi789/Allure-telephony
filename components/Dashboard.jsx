import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports } from '../src/contexts/ReportsContext'

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    reports, 
    summary, 
    loading, 
    error, 
    getReports, 
    getCacheStatus,
    shouldRefreshData 
  } = useReports();

  useEffect(() => {
    const loadReports = async () => {
      try {
        await getReports(); // This will use cache if available
      } catch (err) {
        console.error('Error loading reports:', err);
      }
    };

    loadReports();
  }, [getReports]);

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      console.log('Manual refresh triggered');
      await getReports(true); // Force refresh
    } catch (err) {
      console.error('Error refreshing reports:', err);
    }
  };

  const handleReportClick = (runId) => {
    navigate(`/allure-viewer/${encodeURIComponent(runId)}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Allure Reports</h1>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg text-gray-600">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Allure Reports</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <br />
          <small>Make sure the server is running on http://localhost:5003</small>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Allure Reports Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Cache: {getCacheStatus()}
            {shouldRefreshData && <span className="text-orange-600 ml-2">⚠️ Stale</span>}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Summary Statistics */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Summary</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Reports:</span> {summary.totalReports}
            </div>
            <div>
              <span className="font-medium">Total Tests:</span> {summary.totalTests}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(summary.lastUpdated).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Individual Reports */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {reports.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No reports found
          </div>
        ) : (
          reports.map((report) => (
            <div 
              key={report.runId} 
              className="border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
              onClick={() => handleReportClick(report.runId)}
              title="Click to view detailed Allure report"
            >
              <h3 className="font-semibold text-lg mb-3 text-gray-800">{report.runId}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Tests:</span>
                  <span className="font-medium">{report.summary.statistic.total}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>✅ Passed:</span>
                  <span className="font-medium">{report.summary.statistic.passed}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>❌ Failed:</span>
                  <span className="font-medium">{report.summary.statistic.failed}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>⚠️ Broken:</span>
                  <span className="font-medium">{report.summary.statistic.broken}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>⏭ Skipped:</span>
                  <span className="font-medium">{report.summary.statistic.skipped}</span>
                </div>
              </div>
              
              {/* Success Rate */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span>Success Rate:</span>
                  <span className="font-medium">
                    {report.summary.statistic.total > 0 
                      ? Math.round((report.summary.statistic.passed / report.summary.statistic.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Dashboard;
