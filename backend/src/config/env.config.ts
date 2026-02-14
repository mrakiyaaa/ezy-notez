import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  
  // Database
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/ezy-notez",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
  uploadPath: process.env.UPLOAD_PATH || "./uploads",
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
};
