/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Test } from './Test.js';
export type TestQueryResult = {
    /**
     * Array of Tests
     */
    tests: Array<Test>;
    /**
     * Count of available tests. This is a count of tests that the current user has access to
     */
    count: number;
};

