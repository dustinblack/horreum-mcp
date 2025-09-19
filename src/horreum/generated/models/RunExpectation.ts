/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
export type RunExpectation = {
    id?: number;
    testId: number;
    expectedBefore: Instant;
    expectedBy?: string;
    backlink?: string;
};

