/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Instant } from './Instant.js';
import type { TableReportConfig } from './TableReportConfig.js';
/**
 * Table Report
 */
export type TableReport = {
  id: number;
  /**
   * Table Report Config
   */
  config: TableReportConfig;
  /**
   * Created timestamp
   */
  created: string;
  /**
   * List of ReportComments
   */
  comments: Array<{
    id?: number;
    level: number;
    category?: string;
    componentId?: number;
    comment: string;
  }>;
  /**
   * List of TableReportData
   */
  data: Array<{
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
  }>;
  /**
   * List of ReportLogs
   */
  logs: Array<{
    id: number;
    level: number;
    timestamp: Instant;
    message: string;
    reportId: number;
  }>;
};
