/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Extractor } from './Extractor.js';
/**
 * A transformer extracts labals and applies a Function to convert a Run into one or more Datasets
 */
export type Transformer = {
  /**
   * Access rights for the test. This defines the visibility of the Test in the UI
   */
  access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
  /**
   * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
   */
  owner: string;
  /**
   * Unique Transformer id
   */
  id: number;
  /**
   * Transformer name
   */
  name: string;
  /**
   * Transformer description
   */
  description?: string;
  /**
   * The schema associated with the calculated Datasets. Where a transformer creates a new JSON object with a new structure, this Schema is used to extafct values from the new Dataset JSON document
   */
  targetSchemaUri?: string;
  /**
   * A collection of extractors to extract JSON values to create new Dataset JSON document
   */
  extractors: Array<Extractor>;
  function?: string;
  /**
   * Schema ID that the transform is registered against
   */
  schemaId: number;
  /**
   * Schema Uri that the transform is registered against
   */
  schemaUri: string;
  /**
   * Schema name that the transform is registered against
   */
  schemaName: string;
};
