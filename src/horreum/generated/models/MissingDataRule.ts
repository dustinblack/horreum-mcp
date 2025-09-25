/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
export type MissingDataRule = {
  id: number;
  name?: string;
  labels?: Array<string>;
  condition?: string;
  maxStaleness: number;
  lastNotification?: Instant;
  testId: number;
};
