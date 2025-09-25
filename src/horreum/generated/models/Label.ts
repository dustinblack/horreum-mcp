/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Extractor } from './Extractor.js';
/**
 * A Label is a core component of Horreum, defining which components of the JSON document are part of a KPI and how the metric values are calculated
 */
export type Label = {
  /**
   * Access rights for the test. This defines the visibility of the Test in the UI
   */
  access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
  /**
   * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
   */
  owner: string;
  /**
   * Unique ID for Label
   */
  id: number;
  /**
   * Name for label. NOTE: all Labels are considered to have the same semantic meaning throughout the entire system
   */
  name: string;
  /**
   * A collection of Extractors, that will be combined in the Combination Function
   */
  extractors: Array<Extractor>;
  /**
   * A Combination Function that defines how values from Extractors are combined to produce a Label Value
   */
  function?: string;
  /**
   * Is Label a filtering label? Filtering labels contains values that are used to filter datasets for comparison
   */
  filtering: boolean;
  /**
   * Is Label a metrics label? Metrics labels are contain Metrics that are used for comparison
   */
  metrics: boolean;
  /**
   * Schema ID that the Label relates to
   */
  schemaId: number;
};
