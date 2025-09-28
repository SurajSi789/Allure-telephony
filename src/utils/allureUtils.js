// Allure Viewer Utility Functions
// This file contains all the utility functions for S3 operations, file downloads, and ZIP creation

/**
 * Initialize S3 client with provided configuration
 * @param {Object} s3Config - S3 configuration object
 * @returns {Object} Configured S3 client
 */
export const initializeS3Client = async (s3Config) => {
  try {
    console.log('Initializing S3 client...');
    
    // Check if AWS SDK is available globally (loaded via script tag)
    if (typeof window !== 'undefined' && window.AWS) {
      console.log('Using globally loaded AWS SDK');
      const AWS = window.AWS;
      
      // Configure AWS
      AWS.config.update({
        accessKeyId: s3Config.accessKey,
        secretAccessKey: s3Config.secretKey,
        region: s3Config.region || 'us-east-1'
      });

      const s3Client = new AWS.S3();
      console.log('S3 client initialized successfully');
      return s3Client;
    }
    
    // Fallback: Try to load AWS SDK dynamically if not available globally
    console.log('AWS SDK not found globally, attempting dynamic loading...');
    const cdnUrls = [
      'https://unpkg.com/aws-sdk@2.1692.0/dist/aws-sdk.min.js',
      'https://cdn.jsdelivr.net/npm/aws-sdk@2.1692.0/dist/aws-sdk.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/aws-sdk/2.1692.0/aws-sdk.min.js'
    ];
    
    for (const url of cdnUrls) {
      try {
        console.log(`Trying to load AWS SDK from: ${url}`);
        
        // Create script tag dynamically
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log(`Successfully loaded AWS SDK from: ${url}`);
            resolve();
          };
          script.onerror = () => {
            reject(new Error(`Failed to load from ${url}`));
          };
          document.head.appendChild(script);
        });
        
        // Check if AWS is now available globally
        if (window.AWS) {
          const AWS = window.AWS;
          
          // Configure AWS
          AWS.config.update({
            accessKeyId: s3Config.accessKey,
            secretAccessKey: s3Config.secretKey,
            region: s3Config.region || 'us-east-1'
          });

          const s3Client = new AWS.S3();
          console.log('S3 client initialized successfully');
          return s3Client;
        }
        
      } catch (cdnError) {
        console.warn(`Failed to load AWS SDK from ${url}:`, cdnError);
        continue;
      }
    }
    
    throw new Error('Failed to load AWS SDK from all sources. Please check your internet connection.');
    
  } catch (error) {
    console.error('Error initializing S3 client:', error);
    throw error;
  }
};

/**
 * List all available runs from S3
 * @param {Object} s3Client - Configured S3 client
 * @param {Object} s3Config - S3 configuration object
 * @returns {Array} Array of run objects
 */
export const listAllRuns = async (s3Client, s3Config) => {
  try {
    console.log('Listing all runs from S3...');
    
    const params = {
      Bucket: s3Config.bucketName,
      Prefix: 'reports/',
      Delimiter: '/'
    };

    const data = await s3Client.listObjectsV2(params).promise();
    const runs = data.CommonPrefixes?.map(prefix => {
      const runId = prefix.Prefix.replace('reports/', '').replace('/', '');
      return { runId, name: runId };
    }) || [];

    console.log(`Found ${runs.length} runs`);
    return runs;
  } catch (error) {
    console.error('Error listing runs:', error);
    throw error;
  }
};

/**
 * Fetch test results for a specific run
 * @param {Object} s3Client - Configured S3 client
 * @param {Object} s3Config - S3 configuration object
 * @param {string} runId - Run identifier
 * @returns {Array} Array of test result objects
 */
export const fetchRunResults = async (s3Client, s3Config, runId) => {
  try {
    console.log(`Fetching results for run: ${runId}`);
    
    const params = {
      Bucket: s3Config.bucketName,
      Prefix: `reports/${runId}/`
    };

    const data = await s3Client.listObjectsV2(params).promise();
    const jsonFiles = data.Contents?.filter(obj => obj.Key.endsWith('.json')) || [];

    console.log(`Found ${jsonFiles.length} JSON files for run ${runId}`);

    const results = [];
    for (const file of jsonFiles) {
      try {
        const getParams = {
          Bucket: s3Config.bucketName,
          Key: file.Key
        };
        
        const fileData = await s3Client.getObject(getParams).promise();
        const jsonContent = JSON.parse(fileData.Body.toString('utf-8'));
        
        if (jsonContent.name && jsonContent.status) {
          results.push({
            ...jsonContent,
            runId: runId,
            s3Key: file.Key
          });
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.Key}:`, fileError);
      }
    }

    console.log(`Successfully processed ${results.length} test results for run ${runId}`);
    return results;
  } catch (error) {
    console.error(`Error fetching results for run ${runId}:`, error);
    throw error;
  }
};

/**
 * Download a single text file
 * @param {string} content - File content
 * @param {string} filename - Filename for download
 */
export const downloadTextFile = (content, filename) => {
  try {
    console.log(`=== DOWNLOADING FILE: ${filename} ===`);
    console.log(`Content length: ${content.length} characters`);
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    console.log(`Blob created, size: ${blob.size} bytes`);
    
    const url = URL.createObjectURL(blob);
    console.log(`Blob URL created: ${url}`);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    console.log(`Link element created with download attribute: ${link.download}`);
    
    document.body.appendChild(link);
    console.log('Link added to DOM');
    
    // Force click with multiple methods
    link.click();
    console.log('Link clicked');
    
    // Alternative click method
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: false
    });
    link.dispatchEvent(clickEvent);
    console.log('Alternative click event dispatched');
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Cleanup completed for:', filename);
    }, 100);
    
    console.log(`✅ Download initiated for: ${filename}`);
    
  } catch (error) {
    console.error(`❌ Error downloading file ${filename}:`, error);
    
    // Fallback: try to open in new window
    try {
      const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
      const newWindow = window.open(dataUrl, '_blank');
      if (newWindow) {
        console.log(`📄 Opened ${filename} in new window as fallback`);
      } else {
        console.error('❌ Popup blocked - could not open file in new window');
      }
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError);
    }
  }
};

/**
 * Create and download ZIP file containing multiple log files
 * @param {Array} files - Array of file objects with filename and content
 * @param {Object} testResult - Test result object for naming
 */
export const createAndDownloadZip = async (files, testResult) => {
  try {
    console.log('=== CREATING ZIP FILE ===');
    
    // Dynamic import of JSZip
    const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
    const zip = new JSZip();
    
    console.log(`Adding ${files.length} files to ZIP...`);
    
    // Add each file to the ZIP
    files.forEach((file, index) => {
      console.log(`Adding file ${index + 1}: ${file.filename} (${file.content.length} chars)`);
      zip.file(file.filename, file.content);
    });
    
    console.log('Generating ZIP blob...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    console.log(`ZIP blob created, size: ${zipBlob.size} bytes`);
    
    // Create filename for the ZIP
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const zipFilename = `${testResult.name || 'test'}-logs-${timestamp}.zip`;
    
    console.log(`Downloading ZIP as: ${zipFilename}`);
    
    // Download the ZIP file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('✅ ZIP download completed and cleaned up');
    }, 100);
    
  } catch (error) {
    console.error('❌ Error creating ZIP file:', error);
    
    // Fallback: download files individually
    console.log('Falling back to individual file downloads...');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      downloadTextFile(file.content, file.filename);
      
      // Add delay between downloads
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
};

/**
 * Download all test logs for a specific test case
 * @param {Object} s3Client - Configured S3 client
 * @param {Object} s3Config - S3 configuration object
 * @param {Object} testResult - Test result object
 */
export const downloadAllTestLogs = async (s3Client, s3Config, testResult) => {
  try {
    console.log(`Downloading all logs for test: ${testResult.name}`);
    console.log(`Looking for logs in: reports/${testResult.runId}/`);
    
    // List all objects in the test's S3 directory
    const listParams = {
      Bucket: s3Config.bucketName,
      Prefix: `reports/${testResult.runId}/`
    };
    
    const listData = await s3Client.listObjectsV2(listParams).promise();
    console.log(`Found ${listData.Contents?.length || 0} total objects in S3`);
    
    // Filter for .txt files only
    const txtFiles = listData.Contents?.filter(obj => obj.Key.endsWith('.txt')) || [];
    console.log(`Found ${txtFiles.length} .txt files:`, txtFiles.map(f => f.Key));
    
    if (txtFiles.length === 0) {
      console.log('No .txt files found, generating fallback logs...');
      
      // Generate fallback comprehensive log
      const fallbackLogs = `Test Execution Logs
===================
Test Name: ${testResult.name}
Status: ${testResult.status}
Run ID: ${testResult.runId}
Generated: ${new Date().toISOString()}

SUMMARY:
--------
This test execution did not generate separate log files.
Please check the test configuration or contact the development team.

TEST DETAILS:
${JSON.stringify(testResult, null, 2)}
`;
      
      downloadTextFile(fallbackLogs, `test-logs-${testResult.name || 'test'}-${Date.now()}.txt`);
      return;
    }
    
    // Collect all files and create a ZIP
    console.log('Collecting all log files for ZIP creation...');
    const filesToZip = [];
    
    for (let i = 0; i < txtFiles.length; i++) {
      const file = txtFiles[i];
      try {
        console.log(`Processing file ${i + 1}/${txtFiles.length}:`, file.Key);
        
        const getParams = {
          Bucket: s3Config.bucketName,
          Key: file.Key
        };
        
        const fileData = await s3Client.getObject(getParams).promise();
        const content = fileData.Body.toString('utf-8');
        
        // Extract filename from S3 key
        const originalFilename = file.Key.split('/').pop() || `log-${Date.now()}.txt`;
        
        // Determine log type based on content
        let logType = 'log';
        if (content.includes('NETWORK:') || content.includes('REQUEST:') || content.includes('RESPONSE:')) {
          logType = 'network';
        } else if (content.includes('INFO:') || content.includes('ERROR:') || content.includes('console')) {
          logType = 'console';
        }
        
        // Create clean filename for ZIP
        const cleanFilename = `${logType}-${i + 1}-${originalFilename}`;
        
        console.log(`Added to ZIP: ${cleanFilename} (${content.length} characters)`);
        console.log(`Content preview: ${content.substring(0, 100)}...`);
        
        filesToZip.push({
          filename: cleanFilename,
          content: content
        });
        
      } catch (fileError) {
        console.error(`Error processing file ${file.Key}:`, fileError);
        // Continue with other files
      }
    }
    
    if (filesToZip.length > 0) {
      console.log(`Creating ZIP with ${filesToZip.length} files...`);
      await createAndDownloadZip(filesToZip, testResult);
    } else {
      console.log('No files to ZIP');
    }
    
    console.log(`Successfully processed ${txtFiles.length} log files`);
    
  } catch (error) {
    console.error('Error downloading test logs:', error);
    
    // Fallback error log
    const errorLog = `Error downloading logs for test: ${testResult.name}
Error: ${error.message}
Timestamp: ${new Date().toISOString()}
`;
    downloadTextFile(errorLog, `error-log-${testResult.name || 'test'}-${Date.now()}.txt`);
  }
};

/**
 * Apply filters to test results
 * @param {Array} results - Array of test results
 * @param {Object} filters - Filter object with status and search properties
 * @returns {Array} Filtered results
 */
export const applyFilters = (results, filters) => {
  if (!results || results.length === 0) return [];
  
  let filtered = [...results];
  
  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(result => result.status === filters.status);
  }
  
  // Apply search filter
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.toLowerCase().trim();
    filtered = filtered.filter(result => 
      result.name?.toLowerCase().includes(searchTerm) ||
      result.fullName?.toLowerCase().includes(searchTerm) ||
      result.description?.toLowerCase().includes(searchTerm)
    );
  }
  
  return filtered;
};

/**
 * Get status badge styling based on test status
 * @param {string} status - Test status
 * @returns {Object} Style object with background and text colors
 */
export const getStatusBadgeStyle = (status) => {
  const styles = {
    passed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
    broken: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
    skipped: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⏭️' },
    unknown: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '❓' }
  };
  
  return styles[status] || styles.unknown;
};

/**
 * Format duration from milliseconds to human readable format
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (duration) => {
  if (!duration || duration < 0) return '0ms';
  
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};
