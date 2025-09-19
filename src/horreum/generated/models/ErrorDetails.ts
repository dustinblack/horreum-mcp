/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Validation Error Details
 */
export type ErrorDetails = {
    /**
     * Validation Error type
     */
    type: string;
    code?: string;
    path?: string;
    evaluationPath?: string;
    /**
     * @deprecated
     */
    schemaPath?: string;
    schemaLocation?: string;
    instanceLocation?: string;
    property?: string;
    arguments?: Array<string>;
    details?: string;
    messageKey?: string;
    valid?: boolean;
    message: string;
};

