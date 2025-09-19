/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { APIKeyAuth } from './APIKeyAuth.js';
import type { NoAuth } from './NoAuth.js';
import type { UsernamePassAuth } from './UsernamePassAuth.js';
/**
 * Type of backend datastore
 */
export type ElasticsearchDatastoreConfig = {
    authentication: (NoAuth | APIKeyAuth | UsernamePassAuth);
    /**
     * Built In
     */
    builtIn: boolean;
    /**
     * Elasticsearch url
     */
    url: string;
};

