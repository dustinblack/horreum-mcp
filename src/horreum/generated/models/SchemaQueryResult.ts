/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Schema } from './Schema.js';
export type SchemaQueryResult = {
  /**
   * Array of Schemas
   */
  schemas: Array<Schema>;
  /**
   * Count of available Schemas. This is a count of Schemas that the current user has access to
   */
  count: number;
};
