/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
/**
 * Dataset Log
 */
export type DatasetLog = {
    id: number;
    level: number;
    timestamp: Instant;
    message: string;
    source: string;
    testId: number;
    runId: number;
    datasetId: number;
    datasetOrdinal: number;
};

