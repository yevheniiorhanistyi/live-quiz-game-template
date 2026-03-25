import { Client, RegData } from "../types";
import { send } from "../services/socketService";
import { createPlayer, findPlayerByName, getPlayerPassword } from "../storage";

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
        errorText: "Invalid credentials",
      });
      return;
    }

    client.playerId = existing.index;
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

  send(client.ws, "reg", {
    name: player.name,
    index: player.index,
    error: false,
    errorText: "",
  });
};
