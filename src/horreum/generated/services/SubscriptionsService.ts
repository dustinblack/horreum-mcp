/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Watch } from '../models/Watch.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class SubscriptionsService {
    /**
     * @returns Watch OK
     * @throws ApiError
     */
    public static subscriptionServiceGetSubscription({
        testId,
    }: {
        testId: number,
    }): CancelablePromise<Watch> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/subscriptions/{testId}',
            path: {
                'testId': testId,
            },
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static subscriptionServiceUpdateSubscription({
        testid,
        requestBody,
    }: {
        testid: number,
        requestBody: Watch,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/subscriptions/{testid}',
            path: {
                'testid': testid,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns string OK
     * @throws ApiError
     */
    public static subscriptionServiceAddUserOrTeam({
        testid,
        requestBody,
    }: {
        testid: number,
        requestBody: string,
    }): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/subscriptions/{testid}/add',
            path: {
                'testid': testid,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns string OK
     * @throws ApiError
     */
    public static subscriptionServiceRemoveUserOrTeam({
        testid,
        requestBody,
    }: {
        testid: number,
        requestBody: string,
    }): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/subscriptions/{testid}/remove',
            path: {
                'testid': testid,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
