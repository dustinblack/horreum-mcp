/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProtectedTimeType = {
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
};
