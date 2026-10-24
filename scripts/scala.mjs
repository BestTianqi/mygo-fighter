import { launchScala } from "./scala-process.mjs";
const child = launchScala(process.argv.slice(2));
child.on("error", (error) => {
  console.error(`Cannot start sbt: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
