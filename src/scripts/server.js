import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import archiver from "archiver";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { listAllReports } from "./allureReportFetcher.js";

dotenv.config();

console.log('Starting Allure Telephony Server...');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5003;

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error('JWT_SECRET is not set in .env');

const user = {
  id: 1,
  email: process.env.LOGIN_EMAIL,
  password: bcrypt.hashSync(process.env.LOGIN_PASSWORD, 8),
};

const BUCKET_NAME = process.env.VITE_S3_BUCKET || "allure-report-telephony";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.VITE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY,
    secretAccessKey: process.env.VITE_AWS_SECRET_KEY,
  },
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== user.email) {
    return res.status(400).json({ message: "Invalid email" });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "24h",
  });

  res.json({ token });
});

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
    console.log('Fetching Allure reports from R2...');
    const reports = await listAllReports();
    console.log(`Successfully fetched ${reports.length} reports`);

    const totalTests = reports.reduce((sum, report) => {
      return sum + (report.summary?.statistic?.total || 0);
    }, 0);

    res.json({
      reports,
      summary: {
        totalReports: reports.length,
        totalTests,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({
      error: "Failed to fetch reports",
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/download-report/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    console.log(`Creating download for runId: ${runId}`);

    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `reports/${runId}/`,
      MaxKeys: 1000,
    }));

    const files = listResult.Contents || [];
    console.log(`Found ${files.length} files in R2`);

    if (files.length === 0) {
      return res.status(404).json({ error: `No files found for runId: ${runId}` });
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${runId}.zip"`,
    });

    const archive = archiver('zip', {
      zlib: { level: 1 },
      forceLocalTime: true,
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    archive.pipe(res);

    await Promise.all(files.map(async (file) => {
      const filename = path.basename(file.Key);
      if (!filename) return;
      try {
        const s3Res = await s3Client.send(new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.Key,
        }));
        archive.append(s3Res.Body, { name: filename });
        console.log(`Streaming: ${filename}`);
      } catch (fileError) {
        console.error(`Error streaming file ${file.Key}:`, fileError);
      }
    }));

    await archive.finalize();
    console.log(`Archive created successfully for ${runId}`);

  } catch (error) {
    console.error('Error creating download:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to create download",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

export { streamToString };

app.get("/api/run/:runId/results", async (req, res) => {
  try {
    const { runId } = req.params;

    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `reports/${runId}/`,
      MaxKeys: 1000,
    }));

    const jsonFiles = (listResult.Contents || []).filter(f => f.Key.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return res.json([]);
    }

    const results = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const s3Res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key }));
        const text = await streamToString(s3Res.Body);
        return JSON.parse(text);
      } catch {
        return null;
      }
    }));

    res.json(results.filter(Boolean));
  } catch (error) {
    console.error('Error fetching run results:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/run/:runId/logs", async (req, res) => {
  try {
    const { runId } = req.params;

    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `reports/${runId}/`,
      MaxKeys: 1000,
    }));

    const txtFiles = (listResult.Contents || []).filter(f => f.Key.endsWith('.txt'));

    if (txtFiles.length === 0) {
      return res.status(404).json({ error: 'No log files found for this run' });
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${runId}-logs.zip"`,
    });

    const archive = archiver('zip', { zlib: { level: 1 }, forceLocalTime: true });
    archive.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: 'Failed to create archive' });
    });
    archive.pipe(res);

    await Promise.all(txtFiles.map(async (file) => {
      try {
        const s3Res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key }));
        archive.append(s3Res.Body, { name: path.basename(file.Key) });
      } catch (fileError) {
        console.error(`Error streaming log ${file.Key}:`, fileError);
      }
    }));

    await archive.finalize();
  } catch (error) {
    console.error('Error fetching run logs:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Allure Download Service is running",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
