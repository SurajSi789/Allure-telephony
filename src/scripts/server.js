import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { listAllReports } from "./allureReportFetcher.js";

// Load environment variables
dotenv.config();

console.log('Starting Allure Telephony Server...');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5003;
const SECRET_KEY = "your_secret_key"; // keep it safe

// Dummy user (in real apps, use DB)
const user = {
  id: 1,
  email: "test@example.com",
  password: bcrypt.hashSync("MyOP010199@", 8), // store hashed password
};

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Check email
  if (email !== user.email) {
    return res.status(400).json({ message: "Invalid email" });
  }

  // Check password
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // Generate JWT
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "24h", // Extended to 24 hours for development
  });

  res.json({ token });
});

// Debug endpoint to get a fresh token
app.post("/debug/token", (req, res) => {
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "24h",
  });
  res.json({ 
    token, 
    message: "Fresh token generated",
    expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString()
  });
});

// Protected route example
app.get("/dashboard", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.sendStatus(403);
    res.json({ message: "Welcome to Dashboard", user: decoded });
  });
});


app.get("/api/reports", async (req, res) => {
  try {
    console.log('Fetching Allure reports from S3...');
    const reports = await listAllReports();
    console.log(`Successfully fetched ${reports.length} reports`);
    
    // Add summary statistics
    const totalTests = reports.reduce((sum, report) => {
      return sum + (report.summary?.statistic?.total || 0);
    }, 0);
    
    const response = {
      reports,
      summary: {
        totalReports: reports.length,
        totalTests,
        lastUpdated: new Date().toISOString()
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ 
      error: "Failed to fetch reports", 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Download endpoint for S3 allure-results folders
app.get("/api/download-report/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    
    if (!runId) {
      return res.status(400).json({ error: "RunId is required" });
    }

    console.log(`Creating download for runId: ${runId}`);
    
    // Import required modules
    const path = await import('path');
    // const fs = await import('fs');
    const archiver = await import('archiver');
    
    // Import S3 functionality
    const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    // Get AWS credentials from environment
    const AWS_REGION = process.env.VITE_AWS_REGION || process.env.AWS_REGION || 'eu-north-1';
    const AWS_ACCESS_KEY = process.env.VITE_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY;
    const AWS_SECRET_KEY = process.env.VITE_AWS_SECRET_KEY || process.env.AWS_SECRET_KEY;
    const BUCKET_NAME = process.env.VITE_S3_BUCKET || process.env.S3_BUCKET || 'allure-report-telephony';
    
    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
      throw new Error('AWS credentials not configured. Please check your .env file.');
    }
    
    const s3Client = new S3Client({ 
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });
    
    // List all files from S3 for this runId
    console.log(`Looking for files with prefix: reports/${runId}/`);
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `reports/${runId}/`,
      MaxKeys: 1000,
    });
    
    const listResult = await s3Client.send(listCommand);
    const files = listResult.Contents || [];
    
    console.log(`Found ${files.length} files in S3`);
    if (files.length === 0) {
      return res.status(404).json({ error: `No files found for runId: ${runId}` });
    }
    
    // Set response headers for file download
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${runId}.zip"`,
    });
    
    // Create archive with faster compression
    const archive = archiver.default('zip', { 
      zlib: { level: 1 }, // Fast compression instead of maximum
      forceLocalTime: true
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });
    
    // Track progress
    archive.on('progress', (progress) => {
      console.log(`Archive progress: ${progress.entries.processed}/${progress.entries.total} files`);
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    console.log(`Starting to stream ${files.length} files to archive...`);
    
    // Stream files directly to archive (much faster)
    const streamPromises = files.map(async (file) => {
      const filename = path.basename(file.Key);
      if (filename) { // Skip directories
        try {
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.Key,
          });
          
          const response = await s3Client.send(getCommand);
          
          // Stream directly to archive instead of converting to string
          archive.append(response.Body, { name: filename });
          console.log(`Streaming: ${filename}`);
        } catch (fileError) {
          console.error(`Error streaming file ${file.Key}:`, fileError);
          // Continue with other files
        }
      }
    });
    
    // Wait for all files to be added to the archive
    await Promise.all(streamPromises);
    
    // Finalize the archive
    await archive.finalize();
    console.log(`Archive created successfully for ${runId}`);
    
  } catch (error) {
    console.error('Error creating download:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to create download", 
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Helper function to convert stream to string (used by allureReportFetcher.js)
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// Export for use by other modules
export { streamToString };

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Allure Download Service is running",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));