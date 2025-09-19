/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Label } from './Label.js';
import type { Transformer } from './Transformer.js';
/**
 * Represents a Schema with all associated data used for export/import operations.
 */
export type SchemaExport = {
    /**
     * Access rights for the test. This defines the visibility of the Test in the UI
     */
    access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
    /**
     * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
     */
    owner: string;
    /**
     * Unique Schema ID
     */
    id: number;
    /**
     * Unique, versioned schema URI
     */
    uri: string;
    /**
     * Schema name
     */
    name: string;
    /**
     * Schema Description
     */
    description?: string;
    /**
     * JSON validation schema. Used to validate uploaded JSON documents
     */
    schema?: string;
    /**
     * Array of Labels associated with schema
     */
    labels?: Array<Label>;
    /**
     * Array of Transformers associated with schema
     */
    transformers?: Array<Transformer>;
};

