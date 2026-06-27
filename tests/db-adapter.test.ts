import { createBackend } from '../src/db-adapter';

describe('db-adapter', () => {
  test('createBackend returns sqlite backend by default', async () => {
    const backend = await createBackend();
    expect(backend).toHaveProperty('db');
    expect(backend).toHaveProperty('stmts');
    expect(backend).toHaveProperty('txn');
    expect(backend).toHaveProperty('state');
    expect(backend).toHaveProperty('isAsync');
    expect(backend.isAsync).toBe(false);
    expect(typeof backend.close).toBe('function');
  });

  test('sqlite stmts have run/get/all methods', async () => {
    const backend = await createBackend();
    expect(typeof backend.stmts.nodeCount.get).toBe('function');
    expect(typeof backend.stmts.insertFrontier.run).toBe('function');
    expect(typeof backend.stmts.getBatch.all).toBe('function');
  });

  test('sqlite stmts return promises', async () => {
    const backend = await createBackend();
    const result = await backend.stmts.nodeCount.get();
    expect(result).toHaveProperty('c');
  });

  test('txn has saveNode and insertManyFrontier', async () => {
    const backend = await createBackend();
    expect(typeof backend.txn.saveNode).toBe('function');
    expect(typeof backend.txn.insertManyFrontier).toBe('function');
  });

  test('state has required methods', async () => {
    const backend = await createBackend();
    expect(typeof backend.state.refresh).toBe('function');
    expect(typeof backend.state.fullRefresh).toBe('function');
    expect(typeof backend.state.getDomainCount).toBe('function');
    expect(typeof backend.state.isDomainBlacklisted).toBe('function');
  });

  test('close does not throw', async () => {
    const backend = await createBackend();
    await expect(backend.close()).resolves.not.toThrow();
  });
});
