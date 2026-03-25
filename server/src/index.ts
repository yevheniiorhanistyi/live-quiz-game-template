import { WebSocketServer } from "ws";
import { setupWebSocket } from "./ws";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// WebSocket server
const wss = new WebSocketServer({ port: PORT });

setupWebSocket(wss);
