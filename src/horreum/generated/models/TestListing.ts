/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TestSummary } from './TestSummary.js';
export type TestListing = {
  /**
   * Array of Test Summaries
   */
  tests: Array<TestSummary>;
  /**
   * Number of tests when pagination is ignored
   */
  count: number;
};
