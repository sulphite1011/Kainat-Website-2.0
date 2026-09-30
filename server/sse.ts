import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
}

class SseManager {
  private clients: Client[] = [];

  addClient(id: string, res: Response) {
    this.clients.push({ id, res });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((client) => client.id !== id);
  }

  broadcast(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.res.write(payload);
      } catch (err) {
        // Client might have disconnected
        this.removeClient(client.id);
      }
    });
  }
}

export const sseManager = new SseManager();
