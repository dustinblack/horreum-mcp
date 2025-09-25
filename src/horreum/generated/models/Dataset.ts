/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsonNode } from './JsonNode.js';
import type { ValidationError } from './ValidationError.js';
/**
 * A dataset is the JSON document used as the basis for all comparisons and reporting
 */
export type Dataset = {
  /**
   * Access rights for the test. This defines the visibility of the Test in the UI
   */
  access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
  /**
   * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
   */
  owner: string;
  /**
   * Run Start timestamp
   */
  start: string | number;
  /**
   * Run Stop timestamp
   */
  stop: string | number;
  /**
   * Dataset Unique ID
   */
  id?: number;
  /**
   * Run description
   */
  description?: string;
  /**
   * Test ID that Dataset relates to
   */
  testid: number;
  /**
   * Data payload
   */
  data: JsonNode;
  /**
   * Dataset ordinal for ordered list of Datasets derived from a Run
   */
  ordinal: number;
  /**
   * List of Validation Errors
   */
  validationErrors?: Array<ValidationError>;
  /**
   * Run ID that Dataset relates to
   */
  runId?: number;
};
