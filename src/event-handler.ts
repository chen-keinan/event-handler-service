import amqp from 'amqplib';
import { MongoClient, Db } from 'mongodb';
const DB_NAME = process.env.DB_NAME || 'events_db';
let db: Db;
let client: MongoClient;
const QUEUE_NAME = process.env.QUEUE_NAME || 'events_queue';

export async function handleEvent() {
  const db = await connectToMongo();
  const collection = db.collection('events');

  const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: false });

  console.log(`🎧 Listening to queue "${QUEUE_NAME}"...`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        await collection.insertOne({ ...payload, receivedAt: new Date() });
        console.log('Message saved:', payload);
        channel.ack(msg);
      } catch (err) {
        console.error('Failed to process message', err);
        channel.nack(msg, false, false);
      }
    }
  });
}

export async function connectToMongo(): Promise<Db> {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  }
  return db;
}
