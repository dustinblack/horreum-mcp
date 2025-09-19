/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IndexedLabelValueMap } from './IndexedLabelValueMap.js';
import type { SchemaUsage } from './SchemaUsage.js';
import type { ValidationError } from './ValidationError.js';
export type DatasetSummary = {
    /**
     * Access rights for the test. This defines the visibility of the Test in the UI
     */
    access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
    /**
     * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
     */
    owner: string;
    /**
     * Run Start timestamp
     */
    start: string | number;
    /**
     * Run Stop timestamp
     */
    stop: string | number;
    /**
     * Unique Dataset ID
     */
    id: number;
    /**
     * Run ID that Dataset relates to
     */
    runId: number;
    /**
     * Ordinal position of Dataset Summary on returned List
     */
    ordinal: number;
    /**
     * Test ID that Dataset relates to
     */
    testId: number;
    /**
     * Test name that the Dataset relates to
     */
    testname: string;
    /**
     * Dataset description
     */
    description?: string;
    /**
     * map of view component ids to the LabelValueMap to render the component for this dataset
     */
    view?: IndexedLabelValueMap;
    /**
     * List of Schema usages
     */
    schemas: Array<SchemaUsage>;
    /**
     * List of Validation Errors
     */
    validationErrors?: Array<ValidationError>;
};

