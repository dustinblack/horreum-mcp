/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsonNode } from './JsonNode.js';
import type { SchemaUsage } from './SchemaUsage.js';
import type { ValidationError } from './ValidationError.js';
export type RunExtended = {
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
     * Unique Run ID
     */
    id: number;
    /**
     * Run description
     */
    description?: string;
    /**
     * Test ID run relates to
     */
    testid: number;
    /**
     * Run result payload
     */
    data: JsonNode;
    /**
     * JSON metadata related to run, can be tool configuration etc
     */
    metadata?: JsonNode;
    /**
     * Has Run been deleted from UI
     */
    trashed: boolean;
    /**
     * Collection of Validation Errors in Run payload
     */
    validationErrors?: Array<ValidationError>;
    /**
     * List of Schema Usages
     */
    schemas: Array<SchemaUsage>;
    /**
     * Test name run references
     */
    testname: string;
    /**
     * List of DatasetIDs
     */
    datasets: Array<number>;
};

