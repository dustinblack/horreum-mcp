/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectNode } from './ObjectNode.js';
export type Action = {
  id: number;
  event: string;
  type: string;
  config: ObjectNode;
  secrets: {
    token?: string;
    modified?: boolean;
  };
  testId: number;
  active: boolean;
  runAlways: boolean;
};
