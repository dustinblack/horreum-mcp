/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Test } from './Test.js';
/**
 * Table Report Config
 */
export type TableReportConfig = {
  id: number;
  title: string;
  test?: Test;
  /**
   * ArrayNode of filter labels
   */
  filterLabels?: Array<string>;
  filterFunction?: string;
  /**
   * ArrayNode of category labels
   */
  categoryLabels?: Array<string>;
  categoryFunction?: string;
  categoryFormatter?: string;
  /**
   * ArrayNode of series labels
   */
  seriesLabels: Array<string>;
  seriesFunction?: string;
  seriesFormatter?: string;
  /**
   * ArrayNode of filter labels
   */
  scaleLabels?: Array<string>;
  scaleFunction?: string;
  scaleFormatter?: string;
  scaleDescription?: string;
  /**
   * List of ReportComponents
   */
  components: Array<{
    id?: number;
    name: string;
    order: number;
    /**
     * Array of labels
     */
    labels: Array<string>;
    function?: string;
    unit?: string;
    reportId?: number;
  }>;
};
