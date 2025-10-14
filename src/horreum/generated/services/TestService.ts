/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Access } from '../models/Access.js';
import type { ExportedLabelValues } from '../models/ExportedLabelValues.js';
import type { Fingerprints } from '../models/Fingerprints.js';
import type { RecalculationStatus } from '../models/RecalculationStatus.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { Test } from '../models/Test.js';
import type { TestExport } from '../models/TestExport.js';
import type { TestListing } from '../models/TestListing.js';
import type { TestQueryResult } from '../models/TestQueryResult.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class TestService {
  /**
   * Update an existing test
   * @returns Test Test updated successfully
   * @throws ApiError
   */
  public static testServiceUpdateTest({
    requestBody,
  }: {
    requestBody: Test;
  }): CancelablePromise<Test> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/test',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve a paginated list of Tests with available count
   * @returns TestQueryResult OK
   * @throws ApiError
   */
  public static testServiceListTests({
    roles,
    limit,
    page,
    sort = 'name',
    direction,
  }: {
    /**
     * __my, __all or a comma delimited  list of roles
     */
    roles?: string;
    /**
     * limit the number of results
     */
    limit?: number;
    /**
     * filter by page number of a paginated list of Tests starting from 1
     */
    page?: number;
    /**
     * Field name to sort results
     */
    sort?: string;
    /**
     * Sort direction
     */
    direction?: SortDirection;
  }): CancelablePromise<TestQueryResult> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test',
      query: {
        roles: roles,
        limit: limit,
        page: page,
        sort: sort,
        direction: direction,
      },
    });
  }
  /**
   * Create a new test
   * @returns Test New test created successfully
   * @throws ApiError
   */
  public static testServiceAddTest({
    requestBody,
  }: {
    requestBody: Test;
  }): CancelablePromise<Test> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve a test by name
   * @returns Test OK
   * @throws ApiError
   */
  public static testServiceGetByNameOrId({
    name,
  }: {
    /**
     * Name of test to retrieve
     */
    name: string;
  }): CancelablePromise<Test> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/byName/{name}',
      path: {
        name: name,
      },
    });
  }
  /**
   * Retrieve a list of all folders
   * @returns string List of all folders
   * @throws ApiError
   */
  public static testServiceFolders({
    roles,
  }: {
    /**
     * "__my", "__all" or a comma delimited  list of roles
     */
    roles?: string;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/folders',
      query: {
        roles: roles,
      },
    });
  }
  /**
   * Update an existing Test using its exported version
   * @returns number Test updated successfully using its exported version
   * @throws ApiError
   */
  public static testServiceUpdateTestWithImport({
    requestBody,
  }: {
    requestBody: TestExport;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/test/import',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Import a previously exported Test as new Test
   * @returns number New Test created successfully from a previously exported one
   * @throws ApiError
   */
  public static testServiceAddTestWithImport({
    requestBody,
  }: {
    requestBody: TestExport;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/import',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve a summary of Tests in a folder
   * @returns TestListing OK
   * @throws ApiError
   */
  public static testServiceGetTestSummary({
    roles,
    folder,
    limit = 20,
    page = 1,
    direction,
    name,
  }: {
    /**
     * "__my", "__all" or a comma delimited  list of roles
     */
    roles?: string;
    /**
     * name of the Folder containing the Tests
     */
    folder?: string;
    /**
     * limit the result count
     */
    limit?: number;
    /**
     * filter by page number of a paginated list of, set to 0 means return all results
     */
    page?: number;
    /**
     * Sort direction
     */
    direction?: SortDirection;
    /**
     * Filter by test name
     */
    name?: string;
  }): CancelablePromise<TestListing> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/summary',
      query: {
        roles: roles,
        folder: folder,
        limit: limit,
        page: page,
        direction: direction,
        name: name,
      },
    });
  }
  /**
   * Retrieve a test by id
   * @returns Test OK
   * @throws ApiError
   */
  public static testServiceGetTest({ id }: { id: number }): CancelablePromise<Test> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Delete a Test by id
   * @returns void
   * @throws ApiError
   */
  public static testServiceDeleteTest({ id }: { id: number }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/test/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * @returns TestExport A Test definition formatted as json
   * @throws ApiError
   */
  public static testServiceExportTest({
    id,
  }: {
    id: number;
  }): CancelablePromise<TestExport> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}/export',
      path: {
        id: id,
      },
    });
  }
  /**
   * List all unique Label Values for a Test
   * @returns any OK
   * @throws ApiError
   */
  public static testServiceFilteringLabelValues({
    id,
  }: {
    /**
     * Test ID to retrieve Filtering Label Values for
     */
    id: number;
  }): CancelablePromise<Array<any>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}/filteringLabelValues',
      path: {
        id: id,
      },
    });
  }
  /**
   * List all Fingerprints for a Test
   * @returns Fingerprints OK
   * @throws ApiError
   */
  public static testServiceListFingerprints({
    id,
  }: {
    /**
     * Test ID to retrieve Fingerprints for
     */
    id: number;
  }): CancelablePromise<Array<Fingerprints>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}/fingerprint',
      path: {
        id: id,
      },
    });
  }
  /**
   * List all Label Values for a Test
   * @returns ExportedLabelValues OK
   * @throws ApiError
   */
  public static testServiceGetTestLabelValues({
    id,
    filtering = true,
    metrics = true,
    filter = '{}',
    before = '',
    after = '',
    sort = '',
    direction = 'Ascending',
    limit,
    page,
    include,
    exclude,
    multiFilter = false,
  }: {
    /**
     * Test ID to retrieve Label Values for
     */
    id: number;
    /**
     * Retrieve values for Filtering Labels
     */
    filtering?: boolean;
    /**
     * Retrieve values for Metric Labels
     */
    metrics?: boolean;
    /**
     * either a required json sub-document or path expression
     */
    filter?: string;
    /**
     * ISO-like date time string or epoch millis
     */
    before?: string;
    /**
     * ISO-like date time string or epoch millis
     */
    after?: string;
    /**
     * json path to sortable value or start or stop for sorting by time
     */
    sort?: string;
    /**
     * either Ascending or Descending
     */
    direction?: string;
    /**
     * the maximum number of results to include
     */
    limit?: number;
    /**
     * which page to skip to when using a limit
     */
    page?: number;
    /**
     * label name(s) to include in the result as scalar or comma separated
     */
    include?: Array<string>;
    /**
     * label name(s) to exclude from the result as scalar or comma separated
     */
    exclude?: Array<string>;
    /**
     * enable filtering for multiple values with an array of values
     */
    multiFilter?: boolean;
  }): CancelablePromise<Array<ExportedLabelValues>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}/labelValues',
      path: {
        id: id,
      },
      query: {
        filtering: filtering,
        metrics: metrics,
        filter: filter,
        before: before,
        after: after,
        sort: sort,
        direction: direction,
        limit: limit,
        page: page,
        include: include,
        exclude: exclude,
        multiFilter: multiFilter,
      },
    });
  }
  /**
   * Update the folder for a Test. Tests can be moved to different folders
   * @returns any Created
   * @throws ApiError
   */
  public static testServiceUpdateFolder({
    id,
    folder,
  }: {
    /**
     * Test ID to update
     */
    id: number;
    /**
     * New folder to store the tests
     */
    folder?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/{id}/move',
      path: {
        id: id,
      },
      query: {
        folder: folder,
      },
    });
  }
  /**
   * Update notifications for a Test. It is possible to disable notifications for a Test, so that no notifications are sent to subscribers
   * @returns any Created
   * @throws ApiError
   */
  public static testServiceUpdateNotifications({
    id,
    enabled,
  }: {
    /**
     * Test ID to update
     */
    id: number;
    /**
     * Whether notifications are enabled
     */
    enabled: boolean;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/{id}/notifications',
      path: {
        id: id,
      },
      query: {
        enabled: enabled,
      },
    });
  }
  /**
   * Recalculate Datasets for Test
   * @returns any Created
   * @throws ApiError
   */
  public static testServiceRecalculateTestDatasets({
    id,
  }: {
    /**
     * Test ID to recalculate datasets for
     */
    id: number;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/{id}/recalculate',
      path: {
        id: id,
      },
    });
  }
  /**
   * Get recalculation status for Test
   * @returns RecalculationStatus OK
   * @throws ApiError
   */
  public static testServiceGetTestRecalculationStatus({
    id,
  }: {
    /**
     * Test ID to retrieve recalculation status for
     */
    id: number;
  }): CancelablePromise<RecalculationStatus> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/test/{id}/recalculate',
      path: {
        id: id,
      },
    });
  }
  /**
   * Update transformers for Test
   * @returns any Created
   * @throws ApiError
   */
  public static testServiceUpdateTransformers({
    id,
    requestBody,
  }: {
    /**
     * Test ID to retrieve Label Values for
     */
    id: number;
    requestBody: Array<number>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/{id}/transformers',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Update the Access configuration for a Test
   * @returns any Created
   * @throws ApiError
   */
  public static testServiceUpdateTestAccess({
    id,
    owner,
    access,
  }: {
    /**
     * Test ID to update
     */
    id: number;
    /**
     * Name of the new owner
     */
    owner: string;
    /**
     * New Access level for the Test
     */
    access: Access;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/test/{id}/updateAccess',
      path: {
        id: id,
      },
      query: {
        owner: owner,
        access: access,
      },
    });
  }
}
