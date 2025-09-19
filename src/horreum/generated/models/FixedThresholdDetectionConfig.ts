/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FixThresholdConfig } from './FixThresholdConfig.js';
export type FixedThresholdDetectionConfig = {
    /**
     * Built In
     */
    builtIn: boolean;
    model: 'fixedThreshold';
    /**
     * Lower bound for acceptable datapoint values
     */
    min: FixThresholdConfig;
    /**
     * Upper bound for acceptable datapoint values
     */
    max: FixThresholdConfig;
};

