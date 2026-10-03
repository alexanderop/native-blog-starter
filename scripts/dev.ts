import { startDevelopment } from "../src/shell/dev-server.ts";
await startDevelopment(process.argv.includes("--drafts"));
