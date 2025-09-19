/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
export type Banner = {
    id?: number;
    created?: Instant;
    active: boolean;
    severity: string;
    title: string;
    message?: string;
};

