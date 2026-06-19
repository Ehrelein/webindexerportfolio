import { Kafka, Partitioners, Producer, Consumer, KafkaMessage, Admin } from "kafkajs";
import { FrontierItem } from "./types";

let kafka: Kafka | null = null;
let producer: Producer | null = null;
let consumer: Consumer | null = null;

function getKafka(): Kafka {
  if (kafka) return kafka;
  kafka = new Kafka({
    clientId: "webindexer",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    retry: { initialRetryTime: 100, retries: 3 },
    connectionTimeout: 5000,
    requestTimeout: 10000,
  });
  return kafka;
}

export async function connectProducer(): Promise<boolean> {
  try {
    const k = getKafka();
    producer = k.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: true,
    });
    await producer.connect();
    console.log("[kafka] producer connected");
    return true;
  } catch (e: any) {
    console.warn("[kafka] producer connection failed, using SQLite fallback:", e.message);
    return false;
  }
}

export async function connectConsumer(group?: string): Promise<boolean> {
  try {
    const k = getKafka();
    consumer = k.consumer({
      groupId: group || "webindexer-crawlers",
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    await consumer.connect();
    console.log("[kafka] consumer connected");
    return true;
  } catch (e: any) {
    console.warn("[kafka] consumer connection failed, using SQLite fallback:", e.message);
    return false;
  }
}

// Topic: "crawl-urls" — partitioned by domain for politeness
export const CRAWL_TOPIC: string = "crawl-urls";
export const DLQ_TOPIC: string = "crawl-urls-dlq";
const PROCESSED_TOPIC: string = "crawl-urls-processed";

export class KafkaUrlQueue {
  enabled: boolean;
  localQueue: FrontierItem[];
  seen: Set<string>;
  _seenMax: number;

  constructor() {
    this.enabled = false;
    this.localQueue = [];
    this.seen = new Set();
    this._seenMax = 100000;
  }

  async init(): Promise<boolean> {
    this.enabled = await connectProducer();
    if (this.enabled) {
      const k = getKafka();
      const admin: Admin = k.admin();
      await admin.connect();
      try {
        await admin.createTopics({
          topics: [
            { topic: CRAWL_TOPIC, numPartitions: 6, replicationFactor: 1 },
            { topic: DLQ_TOPIC, numPartitions: 1, replicationFactor: 1 },
            { topic: PROCESSED_TOPIC, numPartitions: 1, replicationFactor: 1 },
          ],
        });
      } catch (e) {
        // topics may already exist
      }
      await admin.disconnect();
    }
    return this.enabled;
  }

  async enqueue(url: string, depth: number, parent: string | null): Promise<void> {
    if (this.seen.has(url)) return;
    this.seen.add(url);
    if (this.seen.size > this._seenMax) {
      const iter = this.seen.keys();
      for (let i = 0; i < this._seenMax / 2; i++) { this.seen.delete(iter.next().value); }
    }

    if (!this.enabled) {
      this.localQueue.push({ url, depth, parent });
      return;
    }

    try {
      await producer!.send({
        topic: CRAWL_TOPIC,
        messages: [
          {
            key: url,
            value: JSON.stringify({ url, depth, parent, enqueuedAt: Date.now() }),
            partition: this._domainPartition(url),
          },
        ],
      });
    } catch (e) {
      this.localQueue.push({ url, depth, parent });
    }
  }

  async enqueueBatch(urls: FrontierItem[]): Promise<void> {
    if (!this.enabled) {
      for (const u of urls) {
        if (!this.seen.has(u.url)) {
          this.seen.add(u.url);
          this.localQueue.push(u);
        }
      }
      return;
    }

    try {
      const messages = urls
        .filter((u) => !this.seen.has(u.url))
        .map((u) => {
          this.seen.add(u.url);
          return {
            key: u.url,
            value: JSON.stringify({ url: u.url, depth: u.depth, parent: u.parent, enqueuedAt: Date.now() }),
            partition: this._domainPartition(u.url),
          };
        });
      if (messages.length > 0) {
        await producer!.send({ topic: CRAWL_TOPIC, messages });
      }
    } catch (e) {
      for (const u of urls) {
        if (!this.seen.has(u.url)) {
          this.seen.add(u.url);
          this.localQueue.push(u);
        }
      }
    }
  }

  dequeue(): FrontierItem | null {
    return this.localQueue.shift() || null;
  }

  size(): number {
    return this.localQueue.length;
  }

  async sendToDlq(url: string, error?: Error): Promise<void> {
    if (!this.enabled) return;
    try {
      await producer!.send({
        topic: DLQ_TOPIC,
        messages: [{ key: url, value: JSON.stringify({ url, error: error?.message, timestamp: Date.now() }) }],
      });
    } catch (e) {}
  }

  async markProcessed(url: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await producer!.send({
        topic: PROCESSED_TOPIC,
        messages: [{ key: url, value: JSON.stringify({ url, processedAt: Date.now() }) }],
      });
    } catch (e) {}
  }

  async consumeMessages(handler: (data: any) => Promise<void>): Promise<void> {
    if (!this.enabled) return;
    const k = getKafka();
    const cons = k.consumer({ groupId: "webindexer-processors" });
    await cons.connect();
    await cons.subscribe({ topic: CRAWL_TOPIC, fromBeginning: false });
    await cons.run({
      eachMessage: async ({ topic, partition, message }: { topic: string; partition: number; message: KafkaMessage }) => {
        try {
          const data = JSON.parse(message.value!.toString());
          await handler(data);
        } catch (e: any) {
          await this.sendToDlq(message.key!.toString(), e);
        }
      },
    });
  }

  _domainPartition(url: string): number {
    try {
      const domain: string = new URL(url).hostname;
      let hash: number = 0;
      for (let i = 0; i < domain.length; i++) {
        hash = (hash * 31 + domain.charCodeAt(i)) | 0;
      }
      return Math.abs(hash) % 6;
    } catch {
      return 0;
    }
  }
}

export async function disconnectKafka(): Promise<void> {
  try {
    if (producer) await producer.disconnect();
    if (consumer) await consumer.disconnect();
  } catch (e) {}
}

export function isConnected(): boolean {
  return !!producer;
}
