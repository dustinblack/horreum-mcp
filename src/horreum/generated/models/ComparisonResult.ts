/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Result of performing a Comparison
 */
export type ComparisonResult = {
  /**
   * Was the Experiment dataset better or worse than the baseline dataset
   */
  overall?: 'BETTER' | 'SAME' | 'WORSE';
  /**
   * Experiment value
   */
  experimentValue?: number;
  /**
   * Baseline value
   */
  baselineValue?: number;
  /**
   * The relative difference between the Experiment and Baseline Datasets
   */
  result?: string;
};
