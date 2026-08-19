import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const supportedApps = ["web", "mobile", "api"];
const supportedEnvironments = ["local", "staging", "production"];

const appDirectories = {
  web: path.join(workspaceRoot, "apps/web"),
  mobile: path.join(workspaceRoot, "apps/mobile"),
  api: workspaceRoot,
};

const contracts = {
  web: [
    {
      name: "NEXT_PUBLIC_API_BASE_URL",
      type: "public-url",
    },
    { name: "DAJEONG_WEB_BASE_URL", type: "public-url" },
    { name: "DAJEONG_COGNITO_DOMAIN", type: "public-url" },
    { name: "DAJEONG_COGNITO_CLIENT_ID", type: "identifier" },
    { name: "DAJEONG_API_AUDIENCE", type: "public-url" },
  ],
  mobile: [
    {
      name: "EXPO_PUBLIC_API_BASE_URL",
      type: "public-url",
    },
  ],
  api: [
    { name: "DAJEONG_DB_HOST", type: "text" },
    { name: "DAJEONG_DB_PORT", type: "port" },
    { name: "DAJEONG_DB_NAME", type: "identifier" },
    { name: "DAJEONG_DB_USER", type: "identifier" },
    { name: "DAJEONG_DB_PASSWORD", type: "secret" },
    { name: "DAJEONG_COGNITO_ISSUER", type: "public-url" },
    { name: "DAJEONG_API_AUDIENCE", type: "public-url" },
  ],
};

const localApiDefaults = {
  DAJEONG_DB_HOST: "localhost",
  DAJEONG_DB_PORT: "5432",
  DAJEONG_DB_NAME: "dajeong",
  DAJEONG_DB_USER: "dajeong",
  DAJEONG_DB_PASSWORD: "dajeong-local-only",
  DAJEONG_COGNITO_ISSUER: "http://127.0.0.1:9090/cognito/local",
  DAJEONG_API_AUDIENCE: "http://localhost:8080/api",
};

const publicPrefixes = ["NEXT_PUBLIC_", "EXPO_PUBLIC_"];
const secretNamePattern =
  /(^|_)(API_KEY|PASSWORD|PRIVATE_KEY|SECRET|SERVICE_ACCOUNT|TOKEN)($|_)/;

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseDotenv(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    values[name] = value;
  }

  return values;
}

function readDotenvFile(filePath) {
  try {
    return parseDotenv(readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function runtimeValues(app, environment) {
  const directory = appDirectories[app];
  const nodeEnvironment = environment === "local" ? "development" : "production";
  const fileNames =
    app === "api"
      ? [".env"]
      : [
          ".env",
          `.env.${nodeEnvironment}`,
          ".env.local",
          `.env.${nodeEnvironment}.local`,
        ];
  const fileValues = {};

  for (const fileName of fileNames) {
    Object.assign(fileValues, readDotenvFile(path.join(directory, fileName)));
  }

  return { ...fileValues, ...process.env };
}

function exampleValues(app) {
  const filePath =
    app === "api"
      ? path.join(workspaceRoot, ".env.example")
      : path.join(appDirectories[app], ".env.example");

  return readDotenvFile(filePath);
}

function validatePublicBoundary(values, errors) {
  for (const name of Object.keys(values)) {
    const isPublic = publicPrefixes.some((prefix) => name.startsWith(prefix));

    if (isPublic && secretNamePattern.test(name)) {
      errors.push(`${name}은(는) 공개 번들 접두사로 비밀값을 노출할 수 없습니다.`);
    }
  }
}

function validateUrl(name, value, environment, errors) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${name}은(는) 유효한 절대 URL이어야 합니다.`);
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    errors.push(`${name}은(는) http 또는 https URL이어야 합니다.`);
  }

  if (parsed.username || parsed.password) {
    errors.push(`${name}에 사용자 이름이나 비밀번호를 포함할 수 없습니다.`);
  }

  if (parsed.search || parsed.hash) {
    errors.push(`${name}에 query string이나 fragment를 포함할 수 없습니다.`);
  }

  if (environment !== "local" && parsed.protocol !== "https:") {
    errors.push(`${name}은(는) ${environment}에서 https URL이어야 합니다.`);
  }
}

export function validateEnvironment(app, environment, inputValues) {
  if (!supportedApps.includes(app)) {
    throw new Error(`지원하지 않는 앱입니다: ${app}`);
  }

  if (!supportedEnvironments.includes(environment)) {
    throw new Error(`지원하지 않는 환경입니다: ${environment}`);
  }

  const values =
    app === "api" && environment === "local"
      ? { ...localApiDefaults, ...inputValues }
      : { ...inputValues };
  const errors = [];

  validatePublicBoundary(values, errors);

  for (const field of contracts[app]) {
    const value = normalizeValue(values[field.name]);

    if (!value) {
      errors.push(`${field.name}이(가) 필요합니다.`);
      continue;
    }

    if (field.type === "public-url") {
      validateUrl(field.name, value, environment, errors);
    } else if (field.type === "port") {
      const port = Number(value);

      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        errors.push(`${field.name}은(는) 1~65535 사이의 정수여야 합니다.`);
      }
    } else if (field.type === "identifier") {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        errors.push(`${field.name}에는 영문, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.`);
      }
    } else if (
      field.type === "secret" &&
      environment !== "local" &&
      value === localApiDefaults.DAJEONG_DB_PASSWORD
    ) {
      errors.push(`${field.name}에 로컬 전용 예제값을 사용할 수 없습니다.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      [
        `${app}/${environment} 환경 설정이 올바르지 않습니다.`,
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
  }

  return Object.fromEntries(
    contracts[app].map(({ name }) => [name, normalizeValue(values[name])]),
  );
}

function readOption(args, name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} 뒤에 값이 필요합니다.`);
  }

  return value;
}

export function runCli(args = process.argv.slice(2)) {
  const selectedApp = readOption(args, "--app") ?? "all";
  const environment =
    readOption(args, "--environment") ||
    normalizeValue(process.env.DAJEONG_ENV) ||
    "local";
  const source = readOption(args, "--source") ?? "runtime";
  const apps = selectedApp === "all" ? supportedApps : [selectedApp];

  if (!supportedEnvironments.includes(environment)) {
    throw new Error(
      `--environment는 ${supportedEnvironments.join(", ")} 중 하나여야 합니다.`,
    );
  }

  if (!supportedApps.includes(selectedApp) && selectedApp !== "all") {
    throw new Error(`--app은 ${supportedApps.join(", ")}, all 중 하나여야 합니다.`);
  }

  if (!["runtime", "example"].includes(source)) {
    throw new Error("--source는 runtime 또는 example이어야 합니다.");
  }

  for (const app of apps) {
    const values =
      source === "example"
        ? exampleValues(app)
        : runtimeValues(app, environment);
    const validated = validateEnvironment(app, environment, values);
    console.log(
      `PASS env ${app}/${environment}: ${Object.keys(validated).sort().join(", ")}`,
    );
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
