/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectNode } from './ObjectNode.js';
/**
 * Instance of backend datastore
 */
export type Datastore = {
    /**
     * Access rights for the test. This defines the visibility of the Test in the UI
     */
    access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
    /**
     * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
     */
    owner: string;
    /**
     * Unique Datastore id
     */
    id: number;
    /**
     * Name of the datastore, used to identify the datastore in the Test definition
     */
    name: string;
    config: ObjectNode;
    /**
     * Type of backend datastore
     */
    type: 'POSTGRES' | 'ELASTICSEARCH' | 'COLLECTORAPI';
};

