/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Table Report Data
 */
export type TableReportData = {
  datasetId: number;
  runId: number;
  ordinal: number;
  category: string;
  series: string;
  scale: string;
  /**
   * Array of values
   */
  values: Array<number>;
};
