/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DatasetInfo } from './DatasetInfo.js';
export type DatapointRecalculationStatus = {
    percentage: number;
    done: boolean;
    totalDatasets?: number;
    errors?: number;
    datasetsWithoutValue: Array<DatasetInfo>;
};

