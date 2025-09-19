/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Banner } from '../models/Banner.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class BannerService {
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static bannerServiceSetBanner({
        requestBody,
    }: {
        requestBody: Banner,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/banner',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns Banner OK
     * @throws ApiError
     */
    public static bannerServiceGetBanner(): CancelablePromise<Banner> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/banner',
        });
    }
}
