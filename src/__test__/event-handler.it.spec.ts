import { GenericContainer, StartedTestContainer } from 'testcontainers';
import * as amqp from 'amqplib';
import { MongoClient } from 'mongodb';
import { handleEvent } from '../event-handler';

jest.setTimeout(30_000); // allow time for containers to spin up

describe('Event Handler Integration Test', () => {
  let rabbitmqContainer: StartedTestContainer;
  let mongodbContainer: StartedTestContainer;
  let mongoClient: MongoClient;
  let mongoUrl: string;
  let amqpUrl: string;

  beforeAll(async () => {
    // Start MongoDB container
    mongodbContainer = await new GenericContainer('mongo')
      .withExposedPorts(27017)
      .start();

    const mongoPort = mongodbContainer.getMappedPort(27017);
    const mongoHost = mongodbContainer.getHost();
    mongoUrl = `mongodb://${mongoHost}:${mongoPort}`;

    // Start RabbitMQ container
    rabbitmqContainer = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672, 15672)
      .start();

    const amqpPort = rabbitmqContainer.getMappedPort(5672);
    const amqpHost = rabbitmqContainer.getHost();
    amqpUrl = `amqp://${amqpHost}:${amqpPort}`;

    process.env.MONGO_URL = mongoUrl;
    process.env.DB_NAME = 'events_db';
    process.env.RABBITMQ_URL = amqpUrl;
    process.env.QUEUE_NAME = 'events_queue';

    // Connect to Mongo (for assertion)
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();

    // Start your actual consumer
    await handleEvent();
  });


  it('should consume message from RabbitMQ and persist to MongoDB', async () => {
    // Connect to RabbitMQ
    const conn = await amqp.connect(amqpUrl);
    const channel = await conn.createChannel();

    const payload = { event: 'test_event', data: 123 };

    await channel.assertQueue('events_queue', { durable: false });
    channel.sendToQueue('events_queue', Buffer.from(JSON.stringify(payload)));
  

    // Wait a bit for the consumer to handle it
    await new Promise((res) => setTimeout(res, 2000));

    // Assert Mongo has it
    const db = mongoClient.db('events_db');
    const docs = await db.collection('events').find({ event: 'test_event' }).toArray();

    expect(docs.length).toBe(1);
    expect(docs[0].data).toBe(123);
    await channel.close();
    await conn.close();
  });
});
