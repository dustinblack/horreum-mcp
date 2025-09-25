/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Datastore } from '../models/Datastore.js';
import type { DatastoreTestResponse } from '../models/DatastoreTestResponse.js';
import type { KeycloakConfig } from '../models/KeycloakConfig.js';
import type { TypeConfig } from '../models/TypeConfig.js';
import type { VersionInfo } from '../models/VersionInfo.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ConfigService {
  /**
   * Update an existing Datastore definition
   * @returns number The ID of the updated Datastore
   * @throws ApiError
   */
  public static configServiceUpdateDatastore({
    requestBody,
  }: {
    requestBody: Datastore;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/config/datastore',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Create a new Datastore
   * @returns number The ID for the new Datastore
   * @throws ApiError
   */
  public static configServiceNewDatastore({
    requestBody,
  }: {
    requestBody: Datastore;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/config/datastore',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Obtain list of configured datastores for particular team
   * @returns Datastore OK
   * @throws ApiError
   */
  public static configServiceGetDatastoresByTeam({
    team,
  }: {
    /**
     * name of the team to search for defined datastores
     */
    team?: string;
  }): CancelablePromise<Array<Datastore>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config/datastore',
      query: {
        team: team,
      },
    });
  }
  /**
   * Obtain list of available datastore types
   * @returns TypeConfig OK
   * @throws ApiError
   */
  public static configServiceDatastoreTypes(): CancelablePromise<Array<TypeConfig>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config/datastore/types',
    });
  }
  /**
   * Test a Datastore
   * @returns void
   * @throws ApiError
   */
  public static configServiceDeleteDatastore({
    id,
  }: {
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/config/datastore/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Test a Datastore connection
   * @returns DatastoreTestResponse OK
   * @throws ApiError
   */
  public static configServiceTestDatastore({
    id,
  }: {
    id: number;
  }): CancelablePromise<DatastoreTestResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config/datastore/{id}/test',
      path: {
        id: id,
      },
    });
  }
  /**
   * Obtain configuration information about keycloak server securing Horreum instance
   * @returns KeycloakConfig OK
   * @throws ApiError
   */
  public static configServiceKeycloak(): CancelablePromise<KeycloakConfig> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config/keycloak',
    });
  }
  /**
   * Obtain version of the running Horreum instance
   * @returns VersionInfo OK
   * @throws ApiError
   */
  public static configServiceVersion(): CancelablePromise<VersionInfo> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config/version',
    });
  }
}
