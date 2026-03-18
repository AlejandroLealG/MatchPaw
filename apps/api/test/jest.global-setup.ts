import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGOD__: MongoMemoryServer;
}

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  process.env['MONGODB_URI'] = mongod.getUri();
}
