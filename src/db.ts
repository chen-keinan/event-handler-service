import { MongoClient, Db } from 'mongodb';
const DB_NAME = process.env.DB_NAME || 'events_db';

let db: Db;
let client: MongoClient;

export async function connectToMongo(): Promise<Db> {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  }
  return db;
}
