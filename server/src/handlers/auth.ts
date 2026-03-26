import { Client, RegData } from "../types/index.js";
import { getClientByPlayerId, setPlayerToClient } from "../ws/index.js";
import { send } from "../services/socketService.js";
import {
  createPlayer,
  findPlayerByName,
  getPlayerPassword,
} from "../storage/index.js";

export const handleReg = (client: Client, data: unknown): void => {
  if (
    typeof data !== "object" ||
    data === null ||
    !("name" in data) ||
    !("password" in data)
  ) {
    send(client.ws, "error", { message: "Invalid registration data" });
    return;
  }
  const { name, password } = data as RegData;

  const existing = findPlayerByName(name);

  if (existing) {
    const storedPassword = getPlayerPassword(name);

    if (storedPassword !== password) {
      send(client.ws, "reg", {
        name,
        index: "",
        error: true,
        errorText: "Authentication failed",
      });
      return;
    }

    const activeClient = getClientByPlayerId(existing.index);

    if (activeClient && activeClient.ws !== client.ws) {
      send(client.ws, "reg", {
        name,
        index: "",
        error: true,
        errorText: "This account is already active in another session",
      });
      return;
    }

    client.playerId = existing.index;
    setPlayerToClient(existing.index, client);

    send(client.ws, "reg", {
      name: existing.name,
      index: existing.index,
      error: false,
      errorText: "",
    });
    return;
  }

  const player = createPlayer(name, password);
  client.playerId = player.index;
  setPlayerToClient(player.index, client);

  send(client.ws, "reg", {
    name: player.name,
    index: player.index,
    error: false,
    errorText: "",
  });
};
