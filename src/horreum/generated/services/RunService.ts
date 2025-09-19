/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Access } from '../models/Access.js';
import type { ExportedLabelValues } from '../models/ExportedLabelValues.js';
import type { Run } from '../models/Run.js';
import type { RunCount } from '../models/RunCount.js';
import type { RunExtended } from '../models/RunExtended.js';
import type { RunsSummary } from '../models/RunsSummary.js';
import type { RunSummary } from '../models/RunSummary.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class RunService {
    /**
     * @returns string OK
     * @throws ApiError
     */
    public static runServiceAutocomplete({
        query,
    }: {
        /**
         * JSONPath to be autocompleted
         */
        query: string,
    }): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/autocomplete',
            query: {
                'query': query,
            },
        });
    }
    /**
     * Retrieve a paginated list of Runs with available count for a given Schema URI
     * @returns RunsSummary OK
     * @throws ApiError
     */
    public static runServiceListRunsBySchema({
        uri,
        limit,
        page,
        sort,
        direction,
    }: {
        /**
         * Schema URI
         */
        uri: string,
        /**
         * limit the number of results
         */
        limit?: number,
        /**
         * filter by page number of a paginated list of Tests
         */
        page?: number,
        /**
         * Field name to sort results
         */
        sort?: string,
        /**
         * Sort direction
         */
        direction?: SortDirection,
    }): CancelablePromise<RunsSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/bySchema',
            query: {
                'uri': uri,
                'limit': limit,
                'page': page,
                'sort': sort,
                'direction': direction,
            },
        });
    }
    /**
     * Run count summary for given Test ID
     * @returns RunCount OK
     * @throws ApiError
     */
    public static runServiceRunCount({
        testId,
    }: {
        /**
         * Test ID
         */
        testId: number,
    }): CancelablePromise<RunCount> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/count',
            query: {
                'testId': testId,
            },
        });
    }
    /**
     * Upload a new Run
     * @returns string The request has been accepted for processing. Returns a list of created run IDs if available, or an empty list if processing is still ongoing. Label values and change detection processing is performed asynchronously.
     * @throws ApiError
     */
    public static runServiceAddRunFromData({
        start,
        stop,
        test,
        requestBody,
        owner,
        access,
        schema,
        description,
    }: {
        /**
         * start timestamp of run, or json path expression
         */
        start: string,
        /**
         * stop timestamp of run, or json path expression
         */
        stop: string,
        /**
         * test name of ID
         */
        test: string,
        requestBody: string,
        /**
         * Name of the new owner
         */
        owner?: string,
        /**
         * New Access level
         */
        access?: Access,
        /**
         * Schema URI
         */
        schema?: string,
        /**
         * Run description
         */
        description?: string,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/data',
            query: {
                'start': start,
                'stop': stop,
                'test': test,
                'owner': owner,
                'access': access,
                'schema': schema,
                'description': description,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Some fields are missing or invalid`,
            },
        });
    }
    /**
     * Retrieve a paginated list of Runs with available count
     * @returns RunsSummary OK
     * @throws ApiError
     */
    public static runServiceListAllRuns({
        query,
        matchAll,
        roles,
        trashed,
        limit,
        page,
        sort,
        direction,
    }: {
        /**
         * query string to filter runs
         */
        query?: string,
        /**
         * match all Runs?
         */
        matchAll?: boolean,
        /**
         * __my, __all or a comma delimited  list of roles
         */
        roles?: string,
        /**
         * show trashed runs
         */
        trashed?: boolean,
        /**
         * limit the number of results
         */
        limit?: number,
        /**
         * filter by page number of a paginated list of Tests
         */
        page?: number,
        /**
         * Field name to sort results
         */
        sort?: string,
        /**
         * Sort direction
         */
        direction?: SortDirection,
    }): CancelablePromise<RunsSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/list',
            query: {
                'query': query,
                'matchAll': matchAll,
                'roles': roles,
                'trashed': trashed,
                'limit': limit,
                'page': page,
                'sort': sort,
                'direction': direction,
            },
        });
    }
    /**
     * Retrieve a paginated list of Runs with available count for a given Test ID
     * @returns RunsSummary OK
     * @throws ApiError
     */
    public static runServiceListTestRuns({
        testId,
        trashed,
        limit,
        page,
        sort,
        direction,
    }: {
        /**
         * Test ID
         */
        testId: number,
        /**
         * include trashed runs
         */
        trashed?: boolean,
        /**
         * limit the number of results
         */
        limit?: number,
        /**
         * filter by page number of a paginated list of Tests
         */
        page?: number,
        /**
         * Field name to sort results
         */
        sort?: string,
        /**
         * Sort direction
         */
        direction?: SortDirection,
    }): CancelablePromise<RunsSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/list/{testId}',
            path: {
                'testId': testId,
            },
            query: {
                'trashed': trashed,
                'limit': limit,
                'page': page,
                'sort': sort,
                'direction': direction,
            },
        });
    }
    /**
     * Recalculate Datasets for Runs between two dates
     * @returns any Created
     * @throws ApiError
     */
    public static runServiceRecalculateAll({
        from,
        to,
    }: {
        /**
         * start timestamp
         */
        from?: string,
        /**
         * end timestamp
         */
        to?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/recalculateAll',
            query: {
                'from': from,
                'to': to,
            },
        });
    }
    /**
     * Upload a new Run
     * @returns number The request has been accepted for processing. Returns a list of created run IDs if available, or an empty list if processing is still ongoing. Label values and change detection processing is performed asynchronously.
     * @throws ApiError
     */
    public static runServiceAddRun({
        requestBody,
        test,
        owner,
        access,
    }: {
        requestBody: Run,
        /**
         * test name of ID
         */
        test?: string,
        /**
         * Name of the new owner
         */
        owner?: string,
        /**
         * New Access level
         */
        access?: Access,
    }): CancelablePromise<Array<number>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/test',
            query: {
                'test': test,
                'owner': owner,
                'access': access,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Some fields are missing or invalid`,
            },
        });
    }
    /**
     * Get extended Run information by Run ID
     * @returns RunExtended Run data with the referenced schemas and generated datasets
     * @throws ApiError
     */
    public static runServiceGetRun({
        id,
    }: {
        /**
         * Run ID
         */
        id: number,
    }): CancelablePromise<RunExtended> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `If no Run have been found with the given id`,
            },
        });
    }
    /**
     * Get Run data by Run ID
     * @returns any Run payload
     * @throws ApiError
     */
    public static runServiceGetData({
        id,
        schemaUri,
    }: {
        /**
         * Run ID
         */
        id: number,
        /**
         * FIlter by Schmea URI
         */
        schemaUri?: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/{id}/data',
            path: {
                'id': id,
            },
            query: {
                'schemaUri': schemaUri,
            },
        });
    }
    /**
     * Update Run description
     * @returns any Created
     * @throws ApiError
     */
    public static runServiceUpdateDescription({
        id,
        requestBody,
    }: {
        /**
         * Run ID
         */
        id: number,
        requestBody: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/{id}/description',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'text/plain',
        });
    }
    /**
     * Get all the label values for the run
     * @returns ExportedLabelValues label Values
     * @throws ApiError
     */
    public static runServiceGetRunLabelValues({
        id,
        filter = '{}',
        sort = '',
        direction = 'Ascending',
        limit = 2147483647,
        page,
        include,
        exclude,
        multiFilter = false,
    }: {
        /**
         * Run Id
         */
        id: number,
        /**
         * either a required json sub-document or path expression
         */
        filter?: string,
        /**
         * label name for sorting
         */
        sort?: string,
        /**
         * either Ascending or Descending
         */
        direction?: string,
        /**
         * the maximum number of results to include
         */
        limit?: number,
        /**
         * which page to skip to when using a limit
         */
        page?: number,
        /**
         * label name(s) to include in the result as scalar or comma separated
         */
        include?: Array<string>,
        /**
         * label name(s) to exclude from the result as scalar or comma separated
         */
        exclude?: Array<string>,
        /**
         * enable filtering for multiple values with an array of values
         */
        multiFilter?: boolean,
    }): CancelablePromise<Array<ExportedLabelValues>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/{id}/labelValues',
            path: {
                'id': id,
            },
            query: {
                'filter': filter,
                'sort': sort,
                'direction': direction,
                'limit': limit,
                'page': page,
                'include': include,
                'exclude': exclude,
                'multiFilter': multiFilter,
            },
        });
    }
    /**
     * Get Run  meta data by Run ID
     * @returns any Run payload
     * @throws ApiError
     */
    public static runServiceGetMetadata({
        id,
        schemaUri,
    }: {
        /**
         * Run ID
         */
        id: number,
        /**
         * Filter by Schmea URI
         */
        schemaUri?: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/{id}/metadata',
            path: {
                'id': id,
            },
            query: {
                'schemaUri': schemaUri,
            },
        });
    }
    /**
     * Recalculate Datasets for Run
     * @returns number Array of generated Datasets
     * @throws ApiError
     */
    public static runServiceRecalculateRunDatasets({
        id,
    }: {
        /**
         * Run ID
         */
        id: number,
    }): CancelablePromise<Array<number>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/{id}/recalculate',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update Run schema for part of JSON data
     * @returns string OK
     * @throws ApiError
     */
    public static runServiceUpdateRunSchema({
        id,
        requestBody,
        path,
    }: {
        /**
         * Run ID
         */
        id: number,
        requestBody: string,
        /**
         * JSON path expression to update schema
         */
        path?: string,
    }): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/{id}/schema',
            path: {
                'id': id,
            },
            query: {
                'path': path,
            },
            body: requestBody,
            mediaType: 'text/plain',
        });
    }
    /**
     * Get Run Summary information by Run ID
     * @returns RunSummary Run summary with the referenced schemas and generated datasets
     * @throws ApiError
     */
    public static runServiceGetRunSummary({
        id,
    }: {
        /**
         * Run ID
         */
        id: number,
    }): CancelablePromise<RunSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/run/{id}/summary',
            path: {
                'id': id,
            },
            errors: {
                404: `If no Run have been found with the given id`,
            },
        });
    }
    /**
     * Trash a Run with a given ID
     * @returns any Created
     * @throws ApiError
     */
    public static runServiceTrash({
        id,
        isTrashed,
    }: {
        /**
         * Run ID
         */
        id: number,
        /**
         * should run be trashed?
         */
        isTrashed?: boolean,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/{id}/trash',
            path: {
                'id': id,
            },
            query: {
                'isTrashed': isTrashed,
            },
        });
    }
    /**
     * Update the Access configuration for a Run
     * @returns any Created
     * @throws ApiError
     */
    public static runServiceUpdateRunAccess({
        id,
        owner,
        access,
    }: {
        /**
         * Run ID to update Access
         */
        id: number,
        /**
         * Name of the new owner
         */
        owner: string,
        /**
         * New Access level
         */
        access: Access,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/run/{id}/updateAccess',
            path: {
                'id': id,
            },
            query: {
                'owner': owner,
                'access': access,
            },
        });
    }
}
