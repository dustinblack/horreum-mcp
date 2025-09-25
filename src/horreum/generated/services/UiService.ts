/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { View } from '../models/View.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class UiService {
  /**
   * @returns View OK
   * @throws ApiError
   */
  public static uiServiceUpdateView({
    requestBody,
  }: {
    requestBody: View;
  }): CancelablePromise<View> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/ui/view',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns any Created
   * @throws ApiError
   */
  public static uiServiceCreateViews({
    requestBody,
  }: {
    requestBody: Array<View>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/ui/views',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static uiServiceDeleteView({
    testId,
    viewId,
  }: {
    testId: number;
    viewId: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/ui/{testId}/view/{viewId}',
      path: {
        testId: testId,
        viewId: viewId,
      },
    });
  }
  /**
   * @returns View OK
   * @throws ApiError
   */
  public static uiServiceGetViews({
    testId,
  }: {
    testId: number;
  }): CancelablePromise<Array<View>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/ui/{testId}/views',
      path: {
        testId: testId,
      },
    });
  }
}
