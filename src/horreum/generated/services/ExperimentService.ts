/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConditionConfig } from '../models/ConditionConfig.js';
import type { ExperimentProfile } from '../models/ExperimentProfile.js';
import type { ExperimentResult } from '../models/ExperimentResult.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ExperimentService {
  /**
   * Retrieve a list of Condition Config models
   * @returns ConditionConfig OK
   * @throws ApiError
   */
  public static experimentServiceModels(): CancelablePromise<Array<ConditionConfig>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/experiment/models',
    });
  }
  /**
   * Run an experiment for a given dataset and experiment profile
   * @returns ExperimentResult Array of experiment results
   * @throws ApiError
   */
  public static experimentServiceRunExperiments({
    datasetId,
  }: {
    /**
     * The dataset to run the experiment on
     */
    datasetId?: number;
  }): CancelablePromise<Array<ExperimentResult>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/experiment/run',
      query: {
        datasetId: datasetId,
      },
    });
  }
  /**
   * Retrieve Experiment Profiles by Test ID
   * @returns ExperimentProfile OK
   * @throws ApiError
   */
  public static experimentServiceProfiles({
    testId,
  }: {
    /**
     * Test ID to retrieve Experiment Profiles for
     */
    testId: number;
  }): CancelablePromise<Array<ExperimentProfile>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/experiment/{testId}/profiles',
      path: {
        testId: testId,
      },
    });
  }
  /**
   * Save new or update existing Experiment Profiles for a Test
   * @returns number OK
   * @throws ApiError
   */
  public static experimentServiceAddOrUpdateProfile({
    testId,
    requestBody,
  }: {
    /**
     * Test ID to retrieve Experiment Profiles for
     */
    testId: number;
    requestBody: ExperimentProfile;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/experiment/{testId}/profiles',
      path: {
        testId: testId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Delete an Experiment Profiles for a Test
   * @returns void
   * @throws ApiError
   */
  public static experimentServiceDeleteProfile({
    testId,
    profileId,
  }: {
    /**
     * Test ID
     */
    testId: number;
    /**
     * Experiment Profile ID
     */
    profileId: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/experiment/{testId}/profiles/{profileId}',
      path: {
        testId: testId,
        profileId: profileId,
      },
    });
  }
}
