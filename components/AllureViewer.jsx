import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReports } from '../src/contexts/ReportsContext';
import {
  initializeS3Client,
  fetchRunResults,
  downloadAllTestLogs,
  applyFilters,
  getStatusBadgeStyle,
  formatDuration
} from '../src/utils/allureUtils.js';

const AllureViewer = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { reports, getReports, getCacheStatus } = useReports();
  const [showPopup, setShowPopup] = useState(false);
  
  // Debug: Log the runId to see what we're receiving
  console.log('AllureViewer received runId:', runId);
  
  // State management
  const [allTestResults, setAllTestResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [s3Config, setS3Config] = useState({
    bucketName: 'allure-report-telephony',
    accessKey: import.meta.env.VITE_AWS_ACCESS_KEY,
    secretKey: import.meta.env.VITE_AWS_SECRET_KEY,
    region: 'eu-north-1'
  });
  const [filters, setFilters] = useState({
    status: '',
    name: ''
  });
  const [summary, setSummary] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0
  });

  // Load saved credentials on component mount
  useEffect(() => {
    const savedAccessKey = localStorage.getItem('aws_access_key');
    const savedSecretKey = localStorage.getItem('aws_secret_key');
    
    if (savedAccessKey || savedSecretKey) {
      setS3Config(prev => ({
        ...prev,
        accessKey: savedAccessKey || '',
        secretKey: savedSecretKey || ''
      }));
    }
  }, []);

  // Fetch test results using extracted utilities
  const fetchTestResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching test results for runId:', runId);
      
      if (runId) {
        // For specific runId, we need to fetch detailed test results from AWS S3
        if (!s3Config.accessKey || !s3Config.secretKey) {
          setError('AWS credentials are required for detailed test results');
          return;
        }

        console.log('Fetching detailed results for specific run:', runId);
        const s3Client = await initializeS3Client(s3Config);
        const results = await fetchRunResults(s3Client, s3Config, runId);
        console.log(`Found ${results.length} tests for run ${runId}`);
        
        setAllTestResults(results);
        
        // Calculate summary
        const newSummary = {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          broken: results.filter(r => r.status === 'broken').length,
          skipped: results.filter(r => r.status === 'skipped').length
        };
        setSummary(newSummary);
      } else {
        // For general view, use cached reports from context (no AWS call needed)
        console.log('Using cached reports for general view');
        await getReports(); // This uses cache if available
        
        // Set empty test results for general view since we're just showing reports list
        setAllTestResults([]);
        setSummary({
          total: reports.length,
          passed: 0,
          failed: 0,
          broken: 0,
          skipped: 0
        });
      }

    } catch (err) {
      console.error('Error fetching test results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [s3Config, runId, getReports, reports.length]);

  // Apply filters using extracted utility
  const handleApplyFilters = useCallback(() => {
    const filtered = applyFilters(allTestResults, {
      status: filters.status,
      search: filters.name
    });
    setFilteredResults(filtered);
  }, [allTestResults, filters]);

  // Handle download logs using extracted utility
  const handleDownloadLogs = async (testResult) => {
    try {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
      const s3Client = await initializeS3Client(s3Config);
      await downloadAllTestLogs(s3Client, s3Config, testResult);
    } catch (error) {
      console.error('Error downloading logs:', error);
      setError(`Failed to download logs: ${error.message}`);
    }
  };

  // Effects
  useEffect(() => {
    if (runId || (s3Config.accessKey && s3Config.secretKey)) {
      fetchTestResults();
    }
  }, [fetchTestResults, runId, s3Config.accessKey, s3Config.secretKey]);

  useEffect(() => {
    handleApplyFilters();
  }, [handleApplyFilters]);

  // Event handlers
  const handleS3ConfigSubmit = (e) => {
    e.preventDefault();
    
    // Save credentials to localStorage
    localStorage.setItem('aws_access_key', s3Config.accessKey);
    localStorage.setItem('aws_secret_key', s3Config.secretKey);
    
    fetchTestResults();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      name: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4"> 
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">🧪 Allure Test Results Viewer</h1>
            <p className="text-xl opacity-90">To see more detailed report, download the report and open it in your local machine</p>
            {runId && (
              <p className="text-lg opacity-80 mt-2 bg-white bg-opacity-10 inline-block px-4 py-2 rounded-lg text-center text-blue-600">
                Viewing: <span className="font-semibold">{runId}</span>
              </p>
            )}
          </div>

          {/* Navigation and Actions */}
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              ← Back to Dashboard
            </button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm opacity-80">
                Cache: {getCacheStatus()}
              </div>
              <button
                onClick={() => getReports(true)}
                disabled={loading}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:bg-opacity-10 text-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
              >
                🔄 {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* S3 Configuration Form - Only show if no runId (manual mode) */}
          {!runId && (
            <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">🔧 S3 Configuration</h2>
              <form onSubmit={handleS3ConfigSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Bucket Name</label>
                    <input
                      type="text"
                      value={s3Config.bucketName}
                      onChange={(e) => setS3Config(prev => ({...prev, bucketName: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder="your-bucket-name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Region</label>
                    <input
                      type="text"
                      value={s3Config.region}
                      onChange={(e) => setS3Config(prev => ({...prev, region: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder="us-east-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Access Key</label>
                    <input
                      type="text"
                      value={s3Config.accessKey}
                      onChange={(e) => setS3Config(prev => ({...prev, accessKey: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder="Your AWS Access Key"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Secret Key</label>
                    <input
                      type="password"
                      value={s3Config.secretKey}
                      onChange={(e) => setS3Config(prev => ({...prev, secretKey: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder="Your AWS Secret Key"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Test Results'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading test results...</p>
          </div>
        )}

        {!loading && allTestResults.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-gray-800">{summary.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">{summary.broken}</div>
                <div className="text-sm text-gray-600">Broken</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-gray-600">{summary.skipped}</div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">🔍 Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="broken">Broken</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
                  <input
                    type="text"
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    placeholder="Search by test name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredResults.length} of {allTestResults.length} tests
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-4">
              {filteredResults.map((result, index) => {
                const statusStyle = getStatusBadgeStyle(result.status);
                
                return (
                  <div key={index} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.icon} {result.status.toUpperCase()}
                            </span>
                            {result.start && (
                              <span className="text-sm text-gray-500">
                                ⏱️ {formatDuration(result.stop - result.start)}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {result.name || result.fullName || 'Unnamed Test'}
                          </h3>
                          {result.description && (
                            <p className="text-gray-600 mb-3">{result.description}</p>
                          )}
                          {result.fullName && result.fullName !== result.name && (
                            <p className="text-sm text-gray-500 mb-2">
                              <strong>Full Name:</strong> {result.fullName}
                            </p>
                          )}
                          {result.runId && (
                            <p className="text-sm text-gray-500">
                              <strong>Run ID:</strong> {result.runId}
                            </p>
                          )}
                        </div>
                        
                        {/* Download Logs Button - Only show for failed/broken tests */}
                        {(result.status === 'failed' || result.status === 'broken') && (
                          <div className="ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleDownloadLogs(result)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download All Logs (ZIP)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Attachments/Steps (if available) */}
                      {result.attachments && result.attachments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">📎 Attachments:</h4>
                          <div className="space-y-1">
                            {result.attachments.map((attachment, attIndex) => (
                              <div key={attIndex} className="text-sm text-gray-600">
                                • {attachment.name || attachment.source || `Attachment ${attIndex + 1}`}
                                {attachment.type && <span className="text-gray-400"> ({attachment.type})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Steps (if available) */}
                      {result.steps && result.steps.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Steps:</h4>
                          <div className="space-y-2">
                            {result.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                                <div className="font-medium">{step.name+" "} 
                                  {step.status && (
                                    <span className={`text-xs ${step.status === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                                      Status: {step.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredResults.length === 0 && allTestResults.length > 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No tests match the current filters</div>
                <button
                  onClick={clearFilters}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}

        {!loading && allTestResults.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No test results found</div>
            <p className="text-gray-400 mt-2">
              {runId ? `No tests found for run: ${runId}` : 'Configure S3 settings and try again'}
            </p>
          </div>
        )}
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white px-6 py-10 rounded-lg shadow-lg">
            <p className="text-lg font-semibold">Download started 🚀</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllureViewer;