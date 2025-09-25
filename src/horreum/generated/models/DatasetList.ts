/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DatasetSummary } from './DatasetSummary.js';
/**
 * Result containing a subset of Dataset Summaries and the total count of available. Used in paginated tables
 */
export type DatasetList = {
  /**
   * Total number of Dataset Summaries available
   */
  total: number;
  /**
   * List of Dataset Summaries. This is often a subset of total available.
   */
  datasets: Array<DatasetSummary>;
};
