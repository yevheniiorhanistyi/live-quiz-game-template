import { Player, Game } from "../types/index.js";
import { generateCode } from "../utils/index.js";

const players: Map<string | number, Player> = new Map();
const playerCredentials: Map<string, string> = new Map();
let playerIdCounter = 1;

const games: Map<string, Game> = new Map();
const gameCodes: Map<string, string> = new Map();

export const createPlayer = (name: string, password: string): Player => {
  const index = playerIdCounter++;
  const player: Player = { name, index, score: 0 };
  players.set(index, player);
  playerCredentials.set(name, password);
  return player;
};

export const findPlayerByName = (name: string): Player | undefined => {
  return [...players.values()].find((p) => p.name === name);
};

export const findPlayerById = (id: number | string): Player | undefined => {
  return players.get(id);
};

export const getPlayerPassword = (name: string): string | undefined => {
  return playerCredentials.get(name);
};

export const createGame = (
  hostId: string | number,
  questions: Game["questions"],
): Game => {
  const id = crypto.randomUUID();
  const code = generateCode();

  const game: Game = {
    id,
    code,
    hostId,
    questions,
    players: [],
    currentQuestion: -1,
    status: "waiting",
  };

  games.set(id, game);
  gameCodes.set(code, id);
  return game;
};

export const findGameByCode = (code: string): Game | undefined => {
  const id = gameCodes.get(code);
  if (!id) return undefined;
  return games.get(id);
};

export const findGameById = (id: string): Game | undefined => {
  return games.get(id);
};
