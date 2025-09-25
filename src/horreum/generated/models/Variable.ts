/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChangeDetection } from './ChangeDetection.js';
export type Variable = {
  id: number;
  testId: number;
  name: string;
  group?: string;
  order: number;
  labels: Array<string>;
  calculation?: string;
  changeDetection: Array<ChangeDetection>;
};
