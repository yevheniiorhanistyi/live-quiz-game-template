import type { WebSocket } from "ws";
import { Game, Player } from "../types/index.js";
import { getClientByPlayerId } from "../ws/wsServer.js";

export const generateCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
};

export const getAllPlayersWs = (game: Game): WebSocket[] => {
  const hostWs = getClientByPlayerId(game.hostId)?.ws;
  const wsList: WebSocket[] = [];

  game.players.forEach((player) => {
    const ws = getClientByPlayerId(player.index)?.ws;
    if (ws) wsList.push(ws);
  });

  if (hostWs && !wsList.includes(hostWs)) {
    return [hostWs, ...wsList];
  }

  return wsList;
};

export const createScoreboard = (players: Player[]) => {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      name: player.name,
      score: player.score,
      rank: index + 1,
    }));
};

export const calculatePoints = (
  timeAnswered: number,
  startTime: number,
  limitSec: number,
): number => {
  const timeRemaining = limitSec - (timeAnswered - startTime) / 1000;
  const points = Math.round(1000 * (timeRemaining / limitSec));
  return Math.max(0, Math.min(1000, points));
};
