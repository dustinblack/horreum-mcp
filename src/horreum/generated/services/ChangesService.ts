/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDefinition } from '../models/AnnotationDefinition.js';
import type { AnnotationsQuery } from '../models/AnnotationsQuery.js';
import type { Query } from '../models/Query.js';
import type { Target } from '../models/Target.js';
import type { TimeseriesTarget } from '../models/TimeseriesTarget.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ChangesService {
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static changesServiceHealthcheck(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/changes',
    });
  }
  /**
   * @returns AnnotationDefinition OK
   * @throws ApiError
   */
  public static changesServiceAnnotations({
    requestBody,
  }: {
    requestBody: AnnotationsQuery;
  }): CancelablePromise<Array<AnnotationDefinition>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/changes/annotations',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns TimeseriesTarget OK
   * @throws ApiError
   */
  public static changesServiceQuery({
    requestBody,
  }: {
    requestBody: Query;
  }): CancelablePromise<Array<TimeseriesTarget>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/changes/query',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns string OK
   * @throws ApiError
   */
  public static changesServiceSearch({
    requestBody,
  }: {
    requestBody: Target;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/changes/search',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
