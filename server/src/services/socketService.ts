import { WebSocket } from "ws";

export const send = (ws: WebSocket, type: string, data: unknown): void => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, data, id: 0 }));
  }
};

export const broadcast = (
  wsList: WebSocket[],
  type: string,
  data: unknown,
): void => {
  const payload = JSON.stringify({ type, data, id: 0 });
  wsList.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  });
};
