import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const checkMongoDBConnection = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

const connectMongoDB = async () => {
  try {
    console.log('🔍 Attempting to connect to MongoDB...');
    
    // Using the new connection string with retryWrites and appName
    const mongourl = process.env.MONGODB_URI || 
      "mongodb+srv://vinciis2025:OJ1QnBMBA0iRro2p@oohditcluster.riu0n1i.mongodb.net/disha?retryWrites=true&w=majority&appName=oohditCluster";
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    const options = {
      // Connection options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Timeout settings
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      
      // Write concern
      w: 'majority',
      wtimeoutMS: 5000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // // SSL/TLS settings
      // ssl: true,
      // tlsAllowInvalidCertificates: false,
      // tlsAllowInvalidHostnames: false
    };

    // Add connection events with more detailed logging
    mongoose.connection.on('connecting', () => {
      console.log('🔄 Attempting to establish MongoDB connection...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      console.log(`   - Host: ${mongoose.connection.host}`);
      console.log(`   - Port: ${mongoose.connection.port}`);
      console.log(`   - Database: ${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      if (err.name === 'MongooseServerSelectionError') {
        console.log('   - This usually indicates a network or DNS issue');
        console.log('   - Please check your internet connection and try again');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB connection lost');
    });

    // Set debug mode for development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query), doc);
      });
    }

    console.log('⏳ Establishing connection to MongoDB...');
    const conn = await mongoose.connect(mongourl, options);
    
    // Verify the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB connection verified');
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Error details:', error);
    
    // Additional troubleshooting based on error type
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
      console.log('3. Try using a different network or VPN');
      console.log('4. Check if MongoDB Atlas is up (status.mongodb.com)');
      console.log('5. Try connecting with MongoDB Compass using the same connection string');
    }
    
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Close the Mongoose connection when the Node process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

export default connectMongoDB;