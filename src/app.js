import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import retailerRoutes from './routes/retailerRoutes.js';
import distributorRoutes from './routes/distributorRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import errorHandler from './middlewares/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static files from the public directory
app.use(express.static('public'));

// Test route
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the API',
    version: '1.0.0'
  });
});

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/distributors', distributorRoutes);
app.use('/api/v1/retailers', retailerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes)


app.use("/", (req, res) => {
  res.send("Server is running OK!!!");
});

// Handle 404 - Keep this as the last route
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
