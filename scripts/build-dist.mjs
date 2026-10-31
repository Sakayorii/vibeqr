// Assemble the Pages deployment directory:
//   dist/functions/**        <- functions/ (routes + _lib)
//   dist/node_modules/@resvg <- the one runtime dependency,
//                               resolved by the Functions bundler
//   dist/robots.txt          <- a static asset so the output dir
//                               is never empty
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("functions", "dist/functions", { recursive: true });
cpSync("node_modules/@resvg", "dist/node_modules/@resvg", {
  recursive: true,
});
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow:\n");
console.log("dist assembled");
