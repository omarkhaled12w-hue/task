import { Redis } from "@upstash/redis";

// Liest UPSTASH_REDIS_REST_URL und UPSTASH_REDIS_REST_TOKEN aus den Env-Variablen.
let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis nicht konfiguriert. Bitte UPSTASH_REDIS_REST_URL und UPSTASH_REDIS_REST_TOKEN setzen."
    );
  }
  client = new Redis({ url, token });
  return client;
}

export const KEYS = {
  tasks: "dentakay:tasks", // Hash: id -> Task(JSON)
  taskSeq: "dentakay:task_seq", // Counter
  seeded: "dentakay:seeded", // Flag
  session: (token: string) => `dentakay:session:${token}`,
  notif: (userId: string) => `dentakay:notif:${userId}`, // List: neueste zuerst
};
