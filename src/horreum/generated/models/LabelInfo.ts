/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SchemaDescriptor } from './SchemaDescriptor.js';
export type LabelInfo = {
  /**
   * Label name
   */
  name: string;
  /**
   * Is label a metrics label?
   */
  metrics: boolean;
  /**
   * Is label a filtering label?
   */
  filtering: boolean;
  /**
   * List of schemas where label is referenced
   */
  schemas: Array<SchemaDescriptor>;
};
