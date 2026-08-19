import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

type ListDisruptionsOperation =
  paths["/api/v1/trips/{tripId}/disruptions"]["get"];
type CreateDisruptionOperation =
  paths["/api/v1/trips/{tripId}/disruptions"]["post"];
type StartDisruptionReplanOperation =
  paths["/api/v1/disruptions/{disruptionId}/replans"]["post"];
type GetProposalSetOperation =
  paths["/api/v1/proposal-sets/{proposalSetId}"]["get"];

export type CreateDisruptionRequest =
  CreateDisruptionOperation["requestBody"]["content"]["application/json"];
export type DisruptionResponse =
  CreateDisruptionOperation["responses"][201]["content"]["application/json"];
export type DisruptionListResponse =
  ListDisruptionsOperation["responses"][200]["content"]["application/json"];
export type ManualDisruptionType = CreateDisruptionRequest["type"];
export type DisruptionType = DisruptionResponse["type"];
export type DisruptionStatus = DisruptionResponse["status"];
export type ReplanStartResponse =
  StartDisruptionReplanOperation["responses"][202]["content"]["application/json"];
export type ProposalSetResponse =
  GetProposalSetOperation["responses"][200]["content"]["application/json"];
export type ProposalResponse = ProposalSetResponse["proposals"][number];
export type ProposalSetStatus = ProposalSetResponse["status"];

export interface DisruptionTripOptions extends ApiClientOptions {
  accessToken?: string;
  signal?: AbortSignal;
  tripId: string;
}

export interface CreateDisruptionOptions extends DisruptionTripOptions {
  idempotencyKey: string;
  request: CreateDisruptionRequest;
}

export interface DisruptionActionOptions extends ApiClientOptions {
  accessToken?: string;
  disruptionId: string;
  idempotencyKey: string;
  signal?: AbortSignal;
}

export interface ProposalSetOptions extends ApiClientOptions {
  accessToken?: string;
  proposalSetId: string;
  signal?: AbortSignal;
}

export async function listDisruptions(
  options: DisruptionTripOptions,
): Promise<DisruptionListResponse> {
  return requestJson<DisruptionListResponse>(
    options,
    `/api/v1/trips/${encodeURIComponent(options.tripId)}/disruptions`,
    "GET",
    [200],
  );
}

export async function createDisruption(
  options: CreateDisruptionOptions,
): Promise<DisruptionResponse> {
  return requestJson<DisruptionResponse>(
    options,
    `/api/v1/trips/${encodeURIComponent(options.tripId)}/disruptions`,
    "POST",
    [200, 201],
    options.request,
    options.idempotencyKey,
  );
}

export async function dismissDisruption(
  options: DisruptionActionOptions,
): Promise<DisruptionResponse> {
  return requestJson<DisruptionResponse>(
    options,
    `/api/v1/disruptions/${encodeURIComponent(options.disruptionId)}/dismiss`,
    "POST",
    [200],
    undefined,
    options.idempotencyKey,
  );
}

export async function startDisruptionReplan(
  options: DisruptionActionOptions,
): Promise<ReplanStartResponse> {
  return requestJson<ReplanStartResponse>(
    options,
    `/api/v1/disruptions/${encodeURIComponent(options.disruptionId)}/replans`,
    "POST",
    [202],
    undefined,
    options.idempotencyKey,
  );
}

export async function getProposalSet(
  options: ProposalSetOptions,
): Promise<ProposalSetResponse> {
  return requestJson<ProposalSetResponse>(
    options,
    `/api/v1/proposal-sets/${encodeURIComponent(options.proposalSetId)}`,
    "GET",
    [200],
  );
}

async function requestJson<Response>(
  options: ApiClientOptions & { accessToken?: string; signal?: AbortSignal },
  path: string,
  method: "GET" | "POST",
  successStatuses: readonly number[],
  requestBody?: unknown,
  idempotencyKey?: string,
): Promise<Response> {
  const headers = jsonHeaders(options.accessToken);
  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (idempotencyKey !== undefined) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  const response = await (options.fetch ?? globalThis.fetch)(
    buildApiUrl(options.baseUrl, path),
    {
      ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
      headers,
      method,
      signal: options.signal,
    },
  );
  if (successStatuses.includes(response.status)) {
    return (await response.json()) as Response;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}
