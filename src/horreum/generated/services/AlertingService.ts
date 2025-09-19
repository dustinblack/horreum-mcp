/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Change } from '../models/Change.js';
import type { ChangeDetection } from '../models/ChangeDetection.js';
import type { ChangeDetectionUpdate } from '../models/ChangeDetectionUpdate.js';
import type { ConditionConfig } from '../models/ConditionConfig.js';
import type { DashboardInfo } from '../models/DashboardInfo.js';
import type { DatapointLastTimestamp } from '../models/DatapointLastTimestamp.js';
import type { DatapointRecalculationStatus } from '../models/DatapointRecalculationStatus.js';
import type { LastDatapointsParams } from '../models/LastDatapointsParams.js';
import type { MissingDataRule } from '../models/MissingDataRule.js';
import type { RunExpectation } from '../models/RunExpectation.js';
import type { Variable } from '../models/Variable.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class AlertingService {
    /**
     * @returns void
     * @throws ApiError
     */
    public static alertingServiceUpdateChange({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: Change,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/alerting/change/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static alertingServiceDeleteChange({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/alerting/change/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static alertingServiceUpdateChangeDetection({
        testId,
        requestBody,
    }: {
        testId: number,
        requestBody: ChangeDetectionUpdate,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/changeDetection',
            query: {
                'testId': testId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns ConditionConfig OK
     * @throws ApiError
     */
    public static alertingServiceChangeDetectionModels(): CancelablePromise<Array<ConditionConfig>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/changeDetectionModels',
        });
    }
    /**
     * @returns Change OK
     * @throws ApiError
     */
    public static alertingServiceChanges({
        _var,
        fingerprint,
    }: {
        _var: number,
        fingerprint?: string,
    }): CancelablePromise<Array<Change>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/changes',
            query: {
                'fingerprint': fingerprint,
                'var': _var,
            },
        });
    }
    /**
     * @returns DashboardInfo OK
     * @throws ApiError
     */
    public static alertingServiceDashboard({
        test,
        fingerprint,
    }: {
        test: number,
        fingerprint?: string,
    }): CancelablePromise<DashboardInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/dashboard',
            query: {
                'fingerprint': fingerprint,
                'test': test,
            },
        });
    }
    /**
     * @returns DatapointLastTimestamp OK
     * @throws ApiError
     */
    public static alertingServiceFindLastDatapoints({
        requestBody,
    }: {
        requestBody: LastDatapointsParams,
    }): CancelablePromise<Array<DatapointLastTimestamp>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/datapoint/last',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns ChangeDetection OK
     * @throws ApiError
     */
    public static alertingServiceDefaultChangeDetectionConfigs(): CancelablePromise<Array<ChangeDetection>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/defaultChangeDetectionConfigs',
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static alertingServiceExpectRun({
        test,
        timeout,
        backlink,
        expectedby,
    }: {
        test: string,
        timeout: number,
        backlink?: string,
        expectedby?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/expectRun',
            query: {
                'backlink': backlink,
                'expectedby': expectedby,
                'test': test,
                'timeout': timeout,
            },
        });
    }
    /**
     * @returns RunExpectation OK
     * @throws ApiError
     */
    public static alertingServiceExpectations(): CancelablePromise<Array<RunExpectation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/expectations',
        });
    }
    /**
     * @returns number OK
     * @throws ApiError
     */
    public static alertingServiceUpdateMissingDataRule({
        testId,
        requestBody,
    }: {
        testId: number,
        requestBody: MissingDataRule,
    }): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/missingdatarule',
            query: {
                'testId': testId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns MissingDataRule OK
     * @throws ApiError
     */
    public static alertingServiceMissingDataRules({
        testId,
    }: {
        testId: number,
    }): CancelablePromise<Array<MissingDataRule>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/missingdatarule',
            query: {
                'testId': testId,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static alertingServiceDeleteMissingDataRule({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/alerting/missingdatarule/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static alertingServiceRecalculateDatapoints({
        test,
        clear,
        debug,
        from,
        notify,
        to,
    }: {
        test: number,
        clear?: boolean,
        debug?: boolean,
        from?: number,
        notify?: boolean,
        to?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/recalculate',
            query: {
                'clear': clear,
                'debug': debug,
                'from': from,
                'notify': notify,
                'test': test,
                'to': to,
            },
        });
    }
    /**
     * @returns DatapointRecalculationStatus OK
     * @throws ApiError
     */
    public static alertingServiceGetDatapointRecalculationStatus({
        test,
    }: {
        test: number,
    }): CancelablePromise<DatapointRecalculationStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/recalculate',
            query: {
                'test': test,
            },
        });
    }
    /**
     * @returns Variable OK
     * @throws ApiError
     */
    public static alertingServiceVariables({
        test,
    }: {
        test?: number,
    }): CancelablePromise<Array<Variable>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alerting/variables',
            query: {
                'test': test,
            },
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static alertingServiceUpdateVariables({
        test,
        requestBody,
    }: {
        test: number,
        requestBody: Array<Variable>,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/alerting/variables',
            query: {
                'test': test,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
