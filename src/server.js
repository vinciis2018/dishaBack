import app from './app.js';
import connectMongoDB from './config/db.js';
import dotenv from 'dotenv';
import colors from 'colors';
import mongoose from 'mongoose';
import { createWebSocket } from './config/socket.js';

dotenv.config();

// Set colors theme
colors.setTheme({
  info: 'green',
  error: 'red',
  warn: 'yellow'
});

const PORT = process.env.PORT || 3333;

// Store the server instance for graceful shutdown
let serverInstance;

// Connect to database
connectMongoDB();
// Create server instance
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "production"} mode on port ${PORT}`.info);
});

// Store the server instance for graceful shutdown
serverInstance = server;

createWebSocket(serverInstance);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...'.error);
  console.error(err.name, err.message);
  // Close server & exit process
  if (serverInstance) {
    serverInstance.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...'.error);
  console.error(err.name, err.message);
  if (serverInstance) {
    serverInstance.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`👋 ${signal} RECEIVED. Shutting down gracefully`.warn);
  
  // Close the server
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('✅ HTTP server closed'.info);
      
      // Close MongoDB connection
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed'.info);
        console.log('💤 Process terminated'.info);
        process.exit(0);
      });
    });
  }

  // Force close the server after 5 seconds
  const timer = setTimeout(() => {
    console.error('💥 Forcing server shutdown'.error);
    process.exit(1);
  }, 5000);

  // Don't keep the process open just for this timer
  if (timer.unref) timer.unref();
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle nodemon restarts
process.once('SIGUSR2', () => {
  gracefulShutdown('nodemon restart');
  setTimeout(() => {
    process.kill(process.pid, 'SIGUSR2');
  }, 1000);
});
