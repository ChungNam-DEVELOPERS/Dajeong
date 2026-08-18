import { spawnSync } from "node:child_process";

const REQUIRED_NODE = "24.19.0";
const REQUIRED_PNPM = "11.22.0";
const REQUIRED_JAVA_MAJOR = "21";

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [result.stdout, result.stderr]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join("\n")
    .trim();

  return {
    ok: result.status === 0 && result.error === undefined,
    output: output || result.error?.message || "not installed",
  };
}

function firstLine(value) {
  return value.split("\n")[0];
}

function printResult(name, passed, actual, expected, required = true) {
  const icon = passed ? "PASS" : required ? "FAIL" : "WARN";
  const expectation = expected ? ` (expected: ${expected})` : "";

  console.log(`${icon.padEnd(4)} ${name.padEnd(16)} ${actual}${expectation}`);
}

let failures = 0;

const nodeVersion = process.versions.node;
const nodePassed = nodeVersion === REQUIRED_NODE;
printResult("Node.js", nodePassed, nodeVersion, REQUIRED_NODE);
failures += nodePassed ? 0 : 1;

const pnpm = run("pnpm", ["--version"]);
const pnpmVersion = firstLine(pnpm.output);
const pnpmPassed = pnpm.ok && pnpmVersion === REQUIRED_PNPM;
printResult("pnpm", pnpmPassed, pnpmVersion, REQUIRED_PNPM);
failures += pnpmPassed ? 0 : 1;

const java = run("java", ["-version"]);
const javaVersionMatch = java.output.match(/version "(?<version>[^"\s]+)/);
const javaVersion = javaVersionMatch?.groups?.version ?? firstLine(java.output);
const javaPassed = java.ok && javaVersion.split(".")[0] === REQUIRED_JAVA_MAJOR;
printResult("Java", javaPassed, javaVersion, `${REQUIRED_JAVA_MAJOR}.x`);
failures += javaPassed ? 0 : 1;

const docker = run("docker", ["--version"]);
printResult("Docker", docker.ok, firstLine(docker.output), "installed");
failures += docker.ok ? 0 : 1;

const compose = run("docker", ["compose", "version"]);
printResult("Docker Compose", compose.ok, firstLine(compose.output), "v2+");
failures += compose.ok ? 0 : 1;

const git = run("git", ["--version"]);
printResult("Git", git.ok, firstLine(git.output), "installed");
failures += git.ok ? 0 : 1;

const aws = run("aws", ["--version"]);
printResult(
  "AWS CLI",
  aws.ok,
  firstLine(aws.output),
  "required by FND-15",
  false,
);

console.log("");

if (failures > 0) {
  console.error(`Toolchain check failed with ${failures} required mismatch(es).`);
  process.exitCode = 1;
} else {
  console.log("Toolchain check passed.");
}
