import { WebSocket, WebSocketServer } from "ws";
import { Client, WSMessage } from "../types";
import { handleReg } from "../handlers/auth";
import { send } from "../services/socketService";
import {
  handleCreateGame,
  handleJoinGame,
  handleStartGame,
  handleLeaveGame,
  handleAnswer,
} from "../handlers/game";

const clients: Map<WebSocket, Client> = new Map();
const playerToClient: Map<string | number, Client> = new Map();

export const setupWebSocket = (wss: WebSocketServer): void => {
  wss.on("connection", (ws) => {
    const client: Client = { ws, playerId: null };
    clients.set(ws, client);
    console.log("Client connected");

    ws.on("message", (raw) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString());
        handleMessage(client, msg);
      } catch {
        send(ws, "error", { message: "Invalid JSON" });
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);

      if (client) {
        handleLeaveGame(client);
        if (client.playerId) playerToClient.delete(client.playerId);
      }

      clients.delete(ws);
      console.log("Client disconnected");
    });
  });
};

function handleMessage(client: Client, msg: WSMessage): void {
  switch (msg.type) {
    case "reg":
      handleReg(client, msg.data);
      break;
    case "create_game":
      handleCreateGame(client, msg.data);
      break;
    case "join_game":
      handleJoinGame(client, msg.data);
      break;
    case "start_game":
      handleStartGame(client, msg.data);
      break;
    case "answer":
      handleAnswer(client, msg.data);
      break;
    default:
      send(client.ws, "error", { message: `Unknown command: ${msg.type}` });
  }
}

export const getClientByPlayerId = (id: string | number) =>
  playerToClient.get(id);

export const getClients = (): Map<WebSocket, Client> => clients;
