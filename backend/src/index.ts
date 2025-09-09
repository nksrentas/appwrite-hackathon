import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'EcoTrace Backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EcoTrace Backend running on port ${PORT}`);
});