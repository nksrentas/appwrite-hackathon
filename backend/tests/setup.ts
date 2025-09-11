import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.env.NODE_ENV = 'test';
process.env.PORT = '3003';

jest.setTimeout(30000);
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock('node-appwrite', () => ({
  Client: jest.fn(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setKey: jest.fn().mockReturnThis(),
    setJWT: jest.fn().mockReturnThis(),
  })),
  Databases: jest.fn(() => ({
    listDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
  })),
  Query: {
    equal: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    orderAsc: jest.fn(),
    orderDesc: jest.fn(),
  },
}));