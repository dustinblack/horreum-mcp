/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RelativeDifferenceDetectionConfig = {
    /**
     * Built In
     */
    builtIn: boolean;
    model: 'relativeDifference';
    /**
     * Relative Difference Detection filter
     */
    filter: string;
    /**
     * Number of most recent datapoints used for aggregating the value for comparison.
     */
    window: number;
    /**
     * Maximum difference between the aggregated value of last <window> datapoints and the mean of preceding values.
     */
    threshold: number;
    /**
     * Minimal number of preceding datapoints
     */
    minPrevious: number;
};

