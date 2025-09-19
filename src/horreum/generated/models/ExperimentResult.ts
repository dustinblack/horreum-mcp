/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ComparisonResult } from './ComparisonResult.js';
import type { DatasetInfo } from './DatasetInfo.js';
import type { DatasetLog } from './DatasetLog.js';
import type { ExperimentProfile } from './ExperimentProfile.js';
/**
 * Result of running an Experiment
 */
export type ExperimentResult = {
    /**
     * Experiment profile that results relates to
     */
    profile?: ExperimentProfile;
    /**
     * A list of log statements recorded while Experiment was evaluated
     */
    logs?: Array<DatasetLog>;
    /**
     * Dataset Info about dataset used for experiment
     */
    datasetInfo?: DatasetInfo;
    /**
     * A list of Dataset Info for experiment baseline(s)
     */
    baseline?: Array<DatasetInfo>;
    /**
     * A Map of all comparisons and results evaluated during an Experiment
     */
    results?: Record<string, ComparisonResult>;
    extraLabels?: string;
    notify?: boolean;
};

