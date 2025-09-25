/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConditionComponent = {
  /**
   * Change detection model component name
   */
  name: string;
  /**
   * Change detection model component title
   */
  title: string;
  /**
   * Change detection model component description
   */
  description: string;
  /**
   * UI Component type
   */
  type: 'LOG_SLIDER' | 'ENUM' | 'NUMBER_BOUND' | 'SWITCH';
  /**
   * Map of properties for component
   */
  properties: Record<string, any>;
};
