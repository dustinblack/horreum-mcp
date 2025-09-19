/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Schema validation error
 */
export type ValidationError = {
    /**
     * Schema ID that Validation Error relates to
     */
    schemaId: number;
    /**
     * Validation Error Details
     */
    error: {
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
};

