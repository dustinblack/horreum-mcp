/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ViewComponent } from './ViewComponent.js';
export type View = {
  id: number;
  name: string;
  testId?: number;
  /**
   * List of components for this view
   */
  components: Array<ViewComponent>;
};
