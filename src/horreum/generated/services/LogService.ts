/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActionLog } from '../models/ActionLog.js';
import type { DatasetLog } from '../models/DatasetLog.js';
import type { TransformationLog } from '../models/TransformationLog.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class LogService {
  /**
   * @returns ActionLog OK
   * @throws ApiError
   */
  public static logServiceGetActionLog({
    testId,
    level = 1,
    limit,
    page,
  }: {
    testId: number;
    level?: number;
    limit?: number;
    page?: number;
  }): CancelablePromise<Array<ActionLog>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/action/{testId}',
      path: {
        testId: testId,
      },
      query: {
        level: level,
        limit: limit,
        page: page,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static logServiceDeleteActionLogs({
    testId,
    from,
    to,
  }: {
    testId: number;
    from?: number;
    to?: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/log/action/{testId}',
      path: {
        testId: testId,
      },
      query: {
        from: from,
        to: to,
      },
    });
  }
  /**
   * @returns number OK
   * @throws ApiError
   */
  public static logServiceGetActionLogCount({
    testId,
    level = 1,
  }: {
    testId: number;
    level?: number;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/action/{testId}/count',
      path: {
        testId: testId,
      },
      query: {
        level: level,
      },
    });
  }
  /**
   * @returns DatasetLog OK
   * @throws ApiError
   */
  public static logServiceGetDatasetLog({
    source,
    testId,
    datasetId,
    level = 1,
    limit,
    page,
  }: {
    source: string;
    testId: number;
    datasetId?: number;
    level?: number;
    limit?: number;
    page?: number;
  }): CancelablePromise<Array<DatasetLog>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/dataset/{source}/{testId}',
      path: {
        source: source,
        testId: testId,
      },
      query: {
        datasetId: datasetId,
        level: level,
        limit: limit,
        page: page,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static logServiceDeleteDatasetLogs({
    source,
    testId,
    datasetId,
    from,
    to,
  }: {
    source: string;
    testId: number;
    datasetId?: number;
    from?: number;
    to?: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/log/dataset/{source}/{testId}',
      path: {
        source: source,
        testId: testId,
      },
      query: {
        datasetId: datasetId,
        from: from,
        to: to,
      },
    });
  }
  /**
   * @returns number OK
   * @throws ApiError
   */
  public static logServiceGetDatasetLogCount({
    source,
    testId,
    datasetId,
    level = 1,
  }: {
    source: string;
    testId: number;
    datasetId?: number;
    level?: number;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/dataset/{source}/{testId}/count',
      path: {
        source: source,
        testId: testId,
      },
      query: {
        datasetId: datasetId,
        level: level,
      },
    });
  }
  /**
   * @returns TransformationLog OK
   * @throws ApiError
   */
  public static logServiceGetTransformationLog({
    testId,
    level = 1,
    limit,
    page,
    runId,
  }: {
    testId: number;
    level?: number;
    limit?: number;
    page?: number;
    runId?: number;
  }): CancelablePromise<Array<TransformationLog>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/transformation/{testId}',
      path: {
        testId: testId,
      },
      query: {
        level: level,
        limit: limit,
        page: page,
        runId: runId,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static logServiceDeleteTransformationLogs({
    testId,
    from,
    runId,
    to,
  }: {
    testId: number;
    from?: number;
    runId?: number;
    to?: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/log/transformation/{testId}',
      path: {
        testId: testId,
      },
      query: {
        from: from,
        runId: runId,
        to: to,
      },
    });
  }
  /**
   * @returns number OK
   * @throws ApiError
   */
  public static logServiceGetTransformationLogCount({
    testId,
    level = 1,
    runId,
  }: {
    testId: number;
    level?: number;
    runId?: number;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/log/transformation/{testId}/count',
      path: {
        testId: testId,
      },
      query: {
        level: level,
        runId: runId,
      },
    });
  }
}
