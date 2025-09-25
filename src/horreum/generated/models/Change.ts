/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DatasetInfo } from './DatasetInfo.js';
import type { Instant } from './Instant.js';
import type { Variable } from './Variable.js';
export type Change = {
  id: number;
  variable: Variable;
  timestamp: Instant;
  confirmed: boolean;
  description?: string;
  dataset?: DatasetInfo;
};
