/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Preview a Label Value derived from a Dataset Data. A preview allows users to apply a Label to a dataset and preview the Label Value result and processing errors in the UI
 */
export type LabelPreview = {
    /**
     * Value value extracted from Dataset. This can be a scalar, array or JSON object
     */
    value?: string;
    /**
     * Description of errors occurred attempting to generate Label Value Preview
     */
    output?: string;
};

