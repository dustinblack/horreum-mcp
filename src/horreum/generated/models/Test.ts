/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Transformer } from './Transformer.js';
/**
 * Represents a Test. Tests are typically equivalent to a particular benchmark
 */
export type Test = {
    /**
     * Access rights for the test. This defines the visibility of the Test in the UI
     */
    access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
    /**
     * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
     */
    owner: string;
    /**
     * Unique Test id
     */
    id: number;
    /**
     * Test name
     */
    name: string;
    /**
     * Name of folder that the test is stored in. Folders allow tests to be organised in the UI
     */
    folder?: string;
    /**
     * Description of the test
     */
    description?: string;
    /**
     * backend ID for backing datastore
     */
    datastoreId: number;
    /**
     * List of label names that are used for determining metric to use as the time series
     */
    timelineLabels?: Array<string>;
    /**
     * Label function to modify timeline labels to a produce a value used for ordering datapoints
     */
    timelineFunction?: string;
    /**
     * Array of Label names that are used to create a fingerprint
     */
    fingerprintLabels?: Array<string>;
    /**
     * Filter function to filter out datasets that are comparable for the purpose of change detection
     */
    fingerprintFilter?: string;
    /**
     * URL to external service that can be called to compare runs.  This is typically an external reporting/visulization service
     */
    compareUrl?: string;
    /**
     * Array for transformers defined for the Test
     */
    transformers?: Array<Transformer>;
    /**
     * Are notifications enabled for the test
     */
    notificationsEnabled: boolean;
};

