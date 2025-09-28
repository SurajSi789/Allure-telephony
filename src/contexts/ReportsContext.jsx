import React, { createContext, useContext, useState, useCallback } from 'react';

const ReportsContext = createContext();

export const useReports = () => {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
};

export const ReportsProvider = ({ children }) => {
  const [reportsCache, setReportsCache] = useState({
    reports: [],
    summary: null,
    lastFetched: null,
    loading: false,
    error: null
  });

  // Check if we need to refresh data (cache is older than 5 minutes or empty)
  const shouldRefreshData = useCallback(() => {
    if (!reportsCache.lastFetched || reportsCache.reports.length === 0) {
      return true;
    }
    
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return reportsCache.lastFetched < fiveMinutesAgo;
  }, [reportsCache.lastFetched, reportsCache.reports.length]);

  // Fetch reports and cache them
  const fetchAndCacheReports = useCallback(async (forceRefresh = false) => {
    // If we have cached data and don't need to refresh, return cached data
    if (!forceRefresh && !shouldRefreshData()) {
      console.log('Using cached reports data');
      return {
        reports: reportsCache.reports,
        summary: reportsCache.summary
      };
    }

    console.log('Fetching fresh reports data from API...');
    setReportsCache(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("http://localhost:5003/api/reports");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const reports = data.reports || [];
      const summary = data.summary || null;

      const newCache = {
        reports,
        summary,
        lastFetched: Date.now(),
        loading: false,
        error: null
      };

      setReportsCache(newCache);
      console.log(`Cached ${reports.length} reports`);
      
      return {
        reports,
        summary
      };

    } catch (error) {
      console.error('Error fetching reports:', error);
      setReportsCache(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, [shouldRefreshData, reportsCache.reports, reportsCache.summary]);

  // Get reports (from cache or fetch if needed)
  const getReports = useCallback(async (forceRefresh = false) => {
    return await fetchAndCacheReports(forceRefresh);
  }, [fetchAndCacheReports]);

  // Clear cache (useful for logout or manual refresh)
  const clearCache = useCallback(() => {
    console.log('Clearing reports cache');
    setReportsCache({
      reports: [],
      summary: null,
      lastFetched: null,
      loading: false,
      error: null
    });
  }, []);

  // Get cache status for UI display
  const getCacheStatus = useCallback(() => {
    if (!reportsCache.lastFetched) {
      return 'No data cached';
    }
    
    const now = Date.now();
    const ageInMinutes = Math.floor((now - reportsCache.lastFetched) / (1000 * 60));
    
    if (ageInMinutes < 1) {
      return 'Just updated';
    } else if (ageInMinutes === 1) {
      return '1 minute ago';
    } else {
      return `${ageInMinutes} minutes ago`;
    }
  }, [reportsCache.lastFetched]);

  const value = {
    // Data
    reports: reportsCache.reports,
    summary: reportsCache.summary,
    loading: reportsCache.loading,
    error: reportsCache.error,
    lastFetched: reportsCache.lastFetched,
    
    // Methods
    getReports,
    clearCache,
    getCacheStatus,
    
    // Status
    shouldRefreshData: shouldRefreshData(),
    hasData: reportsCache.reports.length > 0
  };

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
};
