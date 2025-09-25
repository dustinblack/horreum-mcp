/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
/**
 * Action Log
 */
export type ActionLog = {
  id: number;
  level: number;
  timestamp: Instant;
  message: string;
  testId: number;
  event: string;
  type?: string;
};
