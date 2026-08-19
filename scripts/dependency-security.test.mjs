import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRequire = createRequire(resolve(repositoryRoot, "apps/mobile/package.json"));
const expoPackagePath = mobileRequire.resolve("expo/package.json");
const expoRequire = createRequire(expoPackagePath);
const expoCliPackagePath = expoRequire.resolve("@expo/cli/package.json");
const expoCliRequire = createRequire(expoCliPackagePath);
const expoMetroPackagePath = expoCliRequire.resolve("@expo/metro/package.json");
const expoMetroRequire = createRequire(expoMetroPackagePath);
const metroPackagePath = expoMetroRequire.resolve("metro/package.json");
const metroRequire = createRequire(metroPackagePath);
const imageSizeEntryPath = metroRequire.resolve("image-size");

const imageSizeProbe = `
const imageSize = require(process.argv[1]);
const input = Buffer.from(process.argv[2], "base64");
try {
  imageSize(input);
} catch {}
`;

test("조작된 ICNS·JXL·HEIF 입력이 image-size 이벤트 루프를 점유하지 않는다", async () => {
  const fixtures = new Map([
    ["ICNS", createIcnsZeroLengthEntry()],
    ["JXL", createJxlZeroLengthBox()],
    ["HEIF", createHeifZeroLengthBox()],
  ]);

  for (const [name, input] of fixtures) {
    try {
      await execFileAsync(
        process.execPath,
        ["-e", imageSizeProbe, imageSizeEntryPath, input.toString("base64")],
        { timeout: 1_000 },
      );
    } catch (error) {
      if (error && typeof error === "object" && (error.killed || error.signal)) {
        assert.fail(`${name} 악성 입력 처리가 제한 시간 안에 종료되지 않았습니다.`);
      }
      throw error;
    }
  }
});

test("xcode의 uuid 감사 예외는 인자 없는 v4 호출에만 한정된다", async () => {
  const configPluginsPackagePath = expoRequire.resolve(
    "@expo/config-plugins/package.json",
  );
  const configPluginsRequire = createRequire(configPluginsPackagePath);
  const xcodePackagePath = configPluginsRequire.resolve("xcode/package.json");
  const xcodeRequire = createRequire(xcodePackagePath);
  const uuidPackagePath = xcodeRequire.resolve("uuid/package.json");
  const uuidManifest = JSON.parse(await readFile(uuidPackagePath, "utf8"));
  const xcodeSource = await readFile(
    resolve(dirname(xcodePackagePath), "lib/pbxProject.js"),
    "utf8",
  );

  assert.equal(
    uuidManifest.version,
    "7.0.3",
    "uuid 버전이 바뀌면 GHSA-w5hq-g745-h8pq 예외를 다시 평가해야 합니다.",
  );
  assert.match(xcodeSource, /\buuid\.v4\(\)/);
  assert.doesNotMatch(xcodeSource, /\buuid\.v(?:3|5|6)\s*\(/);
});

function createIcnsZeroLengthEntry() {
  return Buffer.from([
    0x69, 0x63, 0x6e, 0x73,
    0x00, 0x00, 0x00, 0x10,
    0x69, 0x73, 0x33, 0x32,
    0x00, 0x00, 0x00, 0x00,
  ]);
}

function createJxlZeroLengthBox() {
  const input = Buffer.alloc(40);
  input.writeUInt32BE(12, 0);
  input.write("JXL ", 4, "ascii");
  input.writeUInt32BE(20, 12);
  input.write("ftyp", 16, "ascii");
  input.write("jxl ", 20, "ascii");
  input.writeUInt32BE(0, 32);
  input.write("jxlp", 36, "ascii");
  return input;
}

function createHeifZeroLengthBox() {
  return Buffer.from([
    0x00, 0x00, 0x00, 0x10, 0x66, 0x74, 0x79, 0x70,
    0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x24, 0x6d, 0x65, 0x74, 0x61,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x08, 0x69, 0x70, 0x72, 0x70,
    0x00, 0x00, 0x00, 0x14, 0x69, 0x70, 0x63, 0x6f,
    0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x70, 0x65,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}
