/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TestSummary = {
    /**
     * Access rights for the test. This defines the visibility of the Test in the UI
     */
    access: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
    /**
     * Name of the team that owns the test. Users must belong to the team that owns a test to make modifications
     */
    owner: string;
    /**
     * ID of tests
     */
    id: number;
    /**
     * Test name
     */
    name: string;
    /**
     * Name of folder that the test is stored in. Folders allow tests to be organised in the UI
     */
    folder?: string;
    /**
     * Description of the test
     */
    description?: string;
    /**
     * Total number of Datasets for the Test
     */
    datasets?: number;
    /**
     * Total number of Runs for the Test
     */
    runs?: number;
    /**
     * Subscriptions for each test for authenticated user
     */
    watching?: Array<string>;
    /**
     * Datastore id
     */
    datastoreId: number;
};

