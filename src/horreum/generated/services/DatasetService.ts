/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Dataset } from '../models/Dataset.js';
import type { DatasetList } from '../models/DatasetList.js';
import type { DatasetSummary } from '../models/DatasetSummary.js';
import type { Label } from '../models/Label.js';
import type { LabelPreview } from '../models/LabelPreview.js';
import type { LabelValue } from '../models/LabelValue.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class DatasetService {
  /**
   * Retrieve a paginated list of Datasets, with total count, by Schema
   * @returns DatasetList OK
   * @throws ApiError
   */
  public static datasetServiceListDatasetsBySchema({
    uri,
    limit,
    page,
    sort = 'start',
    direction,
  }: {
    /**
     * Schema URI
     */
    uri: string;
    /**
     * limit the number of results
     */
    limit?: number;
    /**
     * filter by page number of a paginated list of Schemas
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
  }): CancelablePromise<DatasetList> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/dataset/bySchema',
      query: {
        uri: uri,
        limit: limit,
        page: page,
        sort: sort,
        direction: direction,
      },
    });
  }
  /**
   * Retrieve a paginated list of Datasets, with total count, by Test
   * @returns DatasetList OK
   * @throws ApiError
   */
  public static datasetServiceListByTest({
    testId,
    filter,
    limit,
    page,
    sort,
    direction,
    viewId,
  }: {
    /**
     * Test ID of test to retrieve list of Datasets
     */
    testId: number;
    /**
     * JOSN Filter expression to apply to query
     */
    filter?: string;
    /**
     * limit the number of results
     */
    limit?: number;
    /**
     * filter by page number of a paginated list of Schemas
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
    /**
     * Optional View ID to filter datasets by view
     */
    viewId?: number;
  }): CancelablePromise<DatasetList> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/dataset/list/{testId}',
      path: {
        testId: testId,
      },
      query: {
        filter: filter,
        limit: limit,
        page: page,
        sort: sort,
        direction: direction,
        viewId: viewId,
      },
    });
  }
  /**
   * @returns LabelValue OK
   * @throws ApiError
   */
  public static datasetServiceGetDatasetLabelValues({
    datasetId,
  }: {
    datasetId: number;
  }): CancelablePromise<Array<LabelValue>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/dataset/{datasetId}/labelValues',
      path: {
        datasetId: datasetId,
      },
    });
  }
  /**
   * @returns LabelPreview OK
   * @throws ApiError
   */
  public static datasetServicePreviewLabel({
    datasetId,
    requestBody,
  }: {
    datasetId: number;
    requestBody: Label;
  }): CancelablePromise<LabelPreview> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/dataset/{datasetId}/previewLabel',
      path: {
        datasetId: datasetId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns DatasetSummary OK
   * @throws ApiError
   */
  public static datasetServiceGetDatasetSummary({
    datasetId,
    viewId,
  }: {
    datasetId: number;
    viewId?: number;
  }): CancelablePromise<DatasetSummary> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/dataset/{datasetId}/summary',
      path: {
        datasetId: datasetId,
      },
      query: {
        viewId: viewId,
      },
    });
  }
  /**
   * Retrieve Dataset by ID
   * @returns Dataset JVM system properties of a particular host.
   * @throws ApiError
   */
  public static datasetServiceGetDataset({
    id,
  }: {
    /**
     * Dataset ID to retrieve
     */
    id: number;
  }): CancelablePromise<Dataset> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/dataset/{id}',
      path: {
        id: id,
      },
      errors: {
        404: `No Dataset with the given id was found`,
      },
    });
  }
}
