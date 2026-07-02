import { fork, ChildProcess } from "child_process";
import path from "path";

let serverProcess: ChildProcess | null = null;

module.exports = async function (): Promise<void> {
  process.env.PORT = "3099";
  process.env.NODE_ENV = "test";

  serverProcess = fork(path.join(__dirname, "../../server.js"), [], {
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: { ...process.env, PORT: "3099", NODE_ENV: "test" },
  });

  (global as any).__SERVER_PROCESS = serverProcess;

  await new Promise<void>((resolve) => {
    serverProcess!.on("message", (msg: any) => {
      if (msg.type === "stats") resolve();
    });
    setTimeout(resolve, 5000);
  });

  console.log("[e2e] Server started on port 3099");
};
