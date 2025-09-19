/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SchemaDescriptor } from './SchemaDescriptor.js';
/**
 * Label Value derived from Label definition and Dataset Data
 */
export type LabelValue = {
    /**
     * Unique ID for Label Value
     */
    id: number;
    /**
     * Label name
     */
    name: string;
    /**
     * Summary description of Schema
     */
    schema: SchemaDescriptor;
    /**
     * Value value extracted from Dataset. This can be a scalar, array or JSON object
     */
    value?: string;
};

