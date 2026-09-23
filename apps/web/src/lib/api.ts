import { httpApi } from "./api-client";

// Production code always uses the real HTTP API. Tests replace this module
// with the contract-validating fixture adapter.
export const api = httpApi;
