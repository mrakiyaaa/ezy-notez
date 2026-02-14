import http from "http";
import app from "./app";
import { config } from "./config/env.config";
import { connectDatabase } from "./config/database.config";
import { initializeWebSocket } from "./websocket";

const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    server.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📦 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
