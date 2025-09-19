/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
import type { KeyType } from './KeyType.js';
export type ApiKeyResponse = {
    id?: number;
    name?: string;
    type?: KeyType;
    creation?: Instant;
    access?: Instant;
    isRevoked?: boolean;
    toExpiration?: number;
};

