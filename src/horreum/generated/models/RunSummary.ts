/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SchemaUsage } from './SchemaUsage.js';
import type { ValidationError } from './ValidationError.js';
export type RunSummary = {
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
   * Run unique ID
   */
  id: number;
  /**
   * test ID run relates to
   */
  testid: number;
  /**
   * test ID run relates to
   */
  testname: string;
  /**
   * has Run been trashed in the UI
   */
  trashed: boolean;
  /**
   * does Run have metadata uploaded alongside Run data
   */
  hasMetadata: boolean;
  /**
   * Run description
   */
  description?: string;
  /**
   * List of all Schema Usages for Run
   */
  schemas?: Array<SchemaUsage>;
  /**
   * Array of datasets ids
   */
  datasets: Array<number>;
  /**
   * Array of validation errors
   */
  validationErrors?: Array<ValidationError>;
};
