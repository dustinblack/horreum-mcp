/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * An Extractor defines how values are extracted from a JSON document, for use in Labels etc.
 */
export type Extractor = {
  /**
   * Name of extractor. This name is used in Combination Functions to refer to values by name
   */
  name: string;
  /**
   * JSON path expression defining the location of the extractor value in the JSON document. This is a pSQL json path expression
   */
  jsonpath: string;
  /**
   * Does the JSON path expression reference an Array?
   */
  isarray: boolean;
};
