/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabelValueMap } from './LabelValueMap.js';
/**
 * A map of label names to label values with the associated datasetId and runId
 */
export type ExportedLabelValues = {
    values?: LabelValueMap;
    /**
     * the run id that created the dataset
     */
    runId?: number;
    /**
     * the unique dataset id
     */
    datasetId?: number;
    /**
     * Start timestamp
     */
    start: string;
    /**
     * Stop timestamp
     */
    stop: string;
};

