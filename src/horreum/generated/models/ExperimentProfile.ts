/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExperimentComparison } from './ExperimentComparison.js';
/**
 * An Experiment Profile defines the labels and filters for the dataset and baseline
 */
export type ExperimentProfile = {
  /**
   * Experiment Profile unique ID
   */
  id: number;
  /**
   * Name of Experiment Profile
   */
  name: string;
  /**
   * Test ID that Experiment Profile relates to
   */
  testId?: number;
  /**
   * Array of selector labels
   */
  selectorLabels: Array<string>;
  /**
   * Selector filter to apply to Selector label values
   */
  selectorFilter?: string;
  /**
   * Array of selector labels for comparison Baseline
   */
  baselineLabels: Array<string>;
  /**
   * Selector filter to apply to Baseline label values
   */
  baselineFilter?: string;
  /**
   * Collection of Experiment Comparisons to run during an Experiment evaluation
   */
  comparisons: Array<ExperimentComparison>;
  /**
   * These labels are not used by Horreum but are added to the result event and therefore can be used e.g. when firing an Action.
   */
  extraLabels?: Array<string>;
};
