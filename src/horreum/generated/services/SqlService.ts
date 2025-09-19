/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsonpathValidation } from '../models/JsonpathValidation.js';
import type { QueryResult } from '../models/QueryResult.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class SqlService {
    /**
     * @returns string OK
     * @throws ApiError
     */
    public static sqlServiceRoles({
        system = false,
    }: {
        system?: boolean,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sql/roles',
            query: {
                'system': system,
            },
        });
    }
    /**
     * Test a JSONPath for syntax errors using database
     * @returns JsonpathValidation OK
     * @throws ApiError
     */
    public static sqlServiceTestJsonPath({
        testjsonpath,
    }: {
        /**
         * JSONPath to be tested
         */
        testjsonpath: string,
    }): CancelablePromise<JsonpathValidation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sql/testjsonpath',
            query: {
                'testjsonpath': testjsonpath,
            },
        });
    }
    /**
     * @returns QueryResult OK
     * @throws ApiError
     */
    public static sqlServiceQueryDatasetData({
        id,
        query,
        array = false,
        schemaUri,
    }: {
        id: number,
        /**
         * JSONPath path executed on the Dataset
         */
        query: string,
        array?: boolean,
        schemaUri?: string,
    }): CancelablePromise<QueryResult> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sql/{id}/querydataset',
            path: {
                'id': id,
            },
            query: {
                'array': array,
                'query': query,
                'schemaUri': schemaUri,
            },
        });
    }
    /**
     * @returns QueryResult OK
     * @throws ApiError
     */
    public static sqlServiceQueryRunData({
        id,
        query,
        array = false,
        uri,
    }: {
        id: number,
        /**
         * JSONPath path executed on the Run
         */
        query: string,
        array?: boolean,
        uri?: string,
    }): CancelablePromise<QueryResult> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sql/{id}/queryrun',
            path: {
                'id': id,
            },
            query: {
                'array': array,
                'query': query,
                'uri': uri,
            },
        });
    }
}
