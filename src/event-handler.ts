import amqp from 'amqplib';
import { connectToMongo } from './db';
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
