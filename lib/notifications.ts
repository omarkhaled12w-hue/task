import { redis, KEYS } from "./redis";

export interface Notification {
  id: string;
  text: string;
  time: number;
  read: boolean;
}

// Fügt eine Benachrichtigung hinzu (neueste zuerst), behält max. 20.
export async function pushNotification(userId: string, text: string): Promise<void> {
  const n: Notification = { id: crypto.randomUUID(), text, time: Date.now(), read: false };
  const key = KEYS.notif(userId);
  await redis().lpush(key, JSON.stringify(n));
  await redis().ltrim(key, 0, 19);
}
