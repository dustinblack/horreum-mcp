/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Action } from '../models/Action.js';
import type { AllowedSite } from '../models/AllowedSite.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ActionService {
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceUpdateAction({
    requestBody,
  }: {
    requestBody: Action;
  }): CancelablePromise<Action> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/action',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceAddAction({
    requestBody,
  }: {
    requestBody: Action;
  }): CancelablePromise<Action> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/action',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns AllowedSite OK
   * @throws ApiError
   */
  public static actionServiceAllowedSites(): CancelablePromise<Array<AllowedSite>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/action/allowedSites',
    });
  }
  /**
   * @returns AllowedSite OK
   * @throws ApiError
   */
  public static actionServiceAddSite({
    requestBody,
  }: {
    requestBody: string;
  }): CancelablePromise<AllowedSite> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/action/allowedSites',
      body: requestBody,
      mediaType: 'text/plain',
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static actionServiceDeleteSite({
    id,
  }: {
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/action/allowedSites/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceAddGlobalAction({
    requestBody,
  }: {
    requestBody: Action;
  }): CancelablePromise<Action> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/action/global',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static actionServiceDeleteGlobalAction({
    id,
  }: {
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/action/global/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceListActions({
    direction,
    limit,
    page,
    sort = 'id',
  }: {
    direction?: SortDirection;
    limit?: number;
    page?: number;
    sort?: string;
  }): CancelablePromise<Array<Action>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/action/list',
      query: {
        direction: direction,
        limit: limit,
        page: page,
        sort: sort,
      },
    });
  }
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceGetTestActions({
    id,
  }: {
    id: number;
  }): CancelablePromise<Array<Action>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/action/test/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * @returns Action OK
   * @throws ApiError
   */
  public static actionServiceGetAction({
    id,
  }: {
    id: number;
  }): CancelablePromise<Action> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/action/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static actionServiceDeleteAction({
    id,
  }: {
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/action/{id}',
      path: {
        id: id,
      },
    });
  }
}
