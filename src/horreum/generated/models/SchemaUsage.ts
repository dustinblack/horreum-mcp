/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SchemaUsage = {
  /**
   * Schema unique ID
   */
  id: number;
  /**
   * Schema name
   */
  name: string;
  /**
   * Schema name
   */
  uri: string;
  /**
   * Source of schema usage, 0 is data, 1 is metadata. DataSets always use 0
   */
  source: number;
  /**
   * Location of Schema Usage, 0 for Run, 1 for Dataset
   */
  type: number;
  /**
   * Ordinal position of schema usage in Run/Dataset
   */
  key?: string;
  /**
   * Does schema have a JSON validation schema defined?
   */
  hasJsonSchema: boolean;
};
