module.exports = async function (): Promise<void> {
  if ((global as any).__SERVER_PROCESS) {
    (global as any).__SERVER_PROCESS.kill("SIGTERM");
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
  console.log("[e2e] Server stopped");
};
