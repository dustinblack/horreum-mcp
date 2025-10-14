/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReportLog } from './ReportLog.js';
import type { TableReportConfig } from './TableReportConfig.js';
import type { TableReportData } from './TableReportData.js';
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
  data: Array<TableReportData>;
  /**
   * List of ReportLogs
   */
  logs: Array<ReportLog>;
};
