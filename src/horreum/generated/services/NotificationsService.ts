/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NotificationSettings } from '../models/NotificationSettings.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class NotificationsService {
  /**
   * @returns string OK
   * @throws ApiError
   */
  public static notificationServiceMethods(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications/methods',
    });
  }
  /**
   * @returns any Created
   * @throws ApiError
   */
  public static notificationServiceUpdateSettings({
    name,
    team,
    requestBody,
  }: {
    name: string;
    team: boolean;
    requestBody: Array<NotificationSettings>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/notifications/settings',
      query: {
        name: name,
        team: team,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns NotificationSettings OK
   * @throws ApiError
   */
  public static notificationServiceSettings({
    name,
    team,
  }: {
    name: string;
    team: boolean;
  }): CancelablePromise<Array<NotificationSettings>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications/settings',
      query: {
        name: name,
        team: team,
      },
    });
  }
  /**
   * @returns any Created
   * @throws ApiError
   */
  public static notificationServiceTestNotifications({
    data,
    method,
  }: {
    data: string;
    method?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/notifications/test',
      query: {
        data: data,
        method: method,
      },
    });
  }
}
