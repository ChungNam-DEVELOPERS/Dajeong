import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(
  packageDirectory,
  "../../services/api/build/generated/openapi/openapi.json",
);
const schemaPath = resolve(packageDirectory, "openapi.json");
const typesPath = resolve(packageDirectory, "src/generated/schema.d.ts");
const checkOnly = process.argv.includes("--check");

const source = JSON.parse(await readFile(sourcePath, "utf8"));

// Springdoc derives this value from the request used to generate the document.
// Consumers provide their own environment-specific base URL at runtime instead.
delete source.servers;

const schema = sortJson(source);
const schemaContents = `${JSON.stringify(schema, null, 2)}\n`;
const ast = await openapiTS(schema, { silent: true });
const typeContents = [
  "/**",
  " * 이 파일은 Spring OpenAPI 계약에서 자동 생성됩니다.",
  " * 직접 수정하지 말고 `pnpm generate:api-client`를 실행하세요.",
  " */",
  "",
  astToString(ast),
].join("\n");

const artifacts = new Map([
  [schemaPath, schemaContents],
  [typesPath, typeContents],
]);

if (checkOnly) {
  const staleArtifacts = [];

  for (const [path, expected] of artifacts) {
    if ((await readExisting(path)) !== expected) {
      staleArtifacts.push(path.replace(`${packageDirectory}/`, ""));
    }
  }

  if (staleArtifacts.length > 0) {
    console.error(
      `OpenAPI 생성물이 최신 계약과 일치하지 않습니다: ${staleArtifacts.join(", ")}`,
    );
    console.error("`pnpm generate:api-client`를 실행한 뒤 변경 사항을 커밋하세요.");
    process.exitCode = 1;
  } else {
    console.log("OpenAPI 스키마와 TypeScript 타입이 최신 상태입니다.");
  }
} else {
  for (const [path, expected] of artifacts) {
    await writeIfChanged(path, expected);
  }

  console.log("OpenAPI 스키마와 TypeScript 타입을 생성했습니다.");
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }

  return value;
}

async function readExisting(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeIfChanged(path, contents) {
  if ((await readExisting(path)) === contents) {
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}
