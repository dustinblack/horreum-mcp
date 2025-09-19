/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
/**
 * Transformation Log
 */
export type TransformationLog = {
    id: number;
    level: number;
    timestamp: Instant;
    message: string;
    testId?: number;
    runId?: number;
};

