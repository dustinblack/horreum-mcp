/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AllTableReports } from '../models/AllTableReports.js';
import type { ReportComment } from '../models/ReportComment.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { TableReport } from '../models/TableReport.js';
import type { TableReportConfig } from '../models/TableReportConfig.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ReportService {
    /**
     * @returns ReportComment OK
     * @throws ApiError
     */
    public static reportServiceUpdateComment({
        reportId,
        requestBody,
    }: {
        reportId: number,
        requestBody: ReportComment,
    }): CancelablePromise<ReportComment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/report/comment/{reportId}',
            path: {
                'reportId': reportId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns AllTableReports OK
     * @throws ApiError
     */
    public static reportServiceGetTableReports({
        direction,
        folder,
        limit,
        page,
        roles,
        sort,
        test,
    }: {
        direction?: SortDirection,
        folder?: string,
        limit?: number,
        page?: number,
        roles?: string,
        sort?: string,
        test?: number,
    }): CancelablePromise<AllTableReports> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/report/table',
            query: {
                'direction': direction,
                'folder': folder,
                'limit': limit,
                'page': page,
                'roles': roles,
                'sort': sort,
                'test': test,
            },
        });
    }
    /**
     * @returns TableReport OK
     * @throws ApiError
     */
    public static reportServiceUpdateTableReportConfig({
        requestBody,
        edit,
    }: {
        requestBody: TableReportConfig,
        edit?: number,
    }): CancelablePromise<TableReport> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/report/table/config',
            query: {
                'edit': edit,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any Created
     * @throws ApiError
     */
    public static reportServiceImportTableReportConfig({
        requestBody,
    }: {
        requestBody: TableReportConfig,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/report/table/config/import',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns TableReportConfig OK
     * @throws ApiError
     */
    public static reportServiceGetTableReportConfig({
        id,
    }: {
        id: number,
    }): CancelablePromise<TableReportConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/report/table/config/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns TableReportConfig OK
     * @throws ApiError
     */
    public static reportServiceExportTableReportConfig({
        id,
    }: {
        id: number,
    }): CancelablePromise<TableReportConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/report/table/config/{id}/export',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns TableReport OK
     * @throws ApiError
     */
    public static reportServicePreviewTableReport({
        requestBody,
        edit,
    }: {
        requestBody: TableReportConfig,
        edit?: number,
    }): CancelablePromise<TableReport> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/report/table/preview',
            query: {
                'edit': edit,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns TableReport OK
     * @throws ApiError
     */
    public static reportServiceGetTableReport({
        id,
    }: {
        id: number,
    }): CancelablePromise<TableReport> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/report/table/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static reportServiceDeleteTableReport({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/report/table/{id}',
            path: {
                'id': id,
            },
        });
    }
}
