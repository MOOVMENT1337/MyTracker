import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(
  new URL("../TrackerWebApp/Client/dist/", import.meta.url),
);
const target = fileURLToPath(new URL("../public/", import.meta.url));

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Copied the Vite build from ${source} to ${target}`);
