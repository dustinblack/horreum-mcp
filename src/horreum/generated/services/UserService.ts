/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiKeyResponse } from '../models/ApiKeyResponse.js';
import type { KeyType } from '../models/KeyType.js';
import type { UserData } from '../models/UserData.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class UserService {
  /**
   * Set the list of administrator users.
   * @returns any Created
   * @throws ApiError
   */
  public static userServiceUpdateAdministrators({
    requestBody,
  }: {
    requestBody: Array<string>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/administrators',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get the list of administrator users.
   * @returns UserData OK
   * @throws ApiError
   */
  public static userServiceAdministrators(): CancelablePromise<Array<UserData>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/administrators',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get list of all teams.
   * @returns string OK
   * @throws ApiError
   */
  public static userServiceGetAllTeams(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/allTeams',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Create a new API key.
   * @returns string OK
   * @throws ApiError
   */
  public static userServiceNewApiKey({
    requestBody,
  }: {
    requestBody: {
      name?: string;
      type?: KeyType;
    };
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/apikey',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * List API keys.
   * @returns ApiKeyResponse OK
   * @throws ApiError
   */
  public static userServiceApiKeys(): CancelablePromise<Array<ApiKeyResponse>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/apikey',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Rename API key.
   * @returns void
   * @throws ApiError
   */
  public static userServiceRenameApiKey({
    id,
    requestBody,
  }: {
    /**
     * id of the key to be renamed
     */
    id: number;
    requestBody: string;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/user/apikey/{id}/rename',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'text/plain',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Revoke API key.
   * @returns void
   * @throws ApiError
   */
  public static userServiceRevokeApiKey({
    id,
  }: {
    /**
     * id of the key to be revoked
     */
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/user/apikey/{id}/revoke',
      path: {
        id: id,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Create new user.
   * @returns any Created
   * @throws ApiError
   */
  public static userServiceCreateUser({
    requestBody,
  }: {
    requestBody: {
      user?: UserData;
      password?: string;
      team?: string;
      roles?: Array<string>;
    };
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/createUser',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Set the default team of the current user.
   * @returns any Created
   * @throws ApiError
   */
  public static userServiceSetDefaultTeam({
    requestBody,
  }: {
    requestBody: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/defaultTeam',
      body: requestBody,
      mediaType: 'text/plain',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get the default team of the current user.
   * @returns string OK
   * @throws ApiError
   */
  public static userServiceDefaultTeam(): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/defaultTeam',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Fetch user data for a group of users.
   * @returns UserData OK
   * @throws ApiError
   */
  public static userServiceInfo({
    requestBody,
  }: {
    requestBody: Array<string>;
  }): CancelablePromise<Array<UserData>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/info',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get roles for the authenticated user.
   * @returns string OK
   * @throws ApiError
   */
  public static userServiceGetRoles(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/roles',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Search for user(s) with an optional query condition.
   * @returns UserData OK
   * @throws ApiError
   */
  public static userServiceSearchUsers({
    query,
  }: {
    query?: string;
  }): CancelablePromise<Array<UserData>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/search',
      query: {
        query: query,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Remove existing team.
   * @returns void
   * @throws ApiError
   */
  public static userServiceDeleteTeam({
    team,
  }: {
    /**
     * Name of the team to be removed
     */
    team: string;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/user/team/{team}',
      path: {
        team: team,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Create new team.
   * @returns any Created
   * @throws ApiError
   */
  public static userServiceAddTeam({
    team,
  }: {
    /**
     * Name of the team to be created
     */
    team: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/team/{team}',
      path: {
        team: team,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Set the membership of a given team.
   * @returns any Created
   * @throws ApiError
   */
  public static userServiceUpdateTeamMembers({
    team,
    requestBody,
  }: {
    /**
     * Name of the team
     */
    team: string;
    requestBody: Record<string, Array<any>>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/user/team/{team}/members',
      path: {
        team: team,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get the membership of a given team.
   * @returns any OK
   * @throws ApiError
   */
  public static userServiceTeamMembers({
    team,
  }: {
    /**
     * Name of the team
     */
    team: string;
  }): CancelablePromise<Record<string, Array<any>>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/team/{team}/members',
      path: {
        team: team,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Get list of all teams.
   * @returns string OK
   * @throws ApiError
   */
  public static userServiceGetTeams(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/user/teams',
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
  /**
   * Remove existing user.
   * @returns void
   * @throws ApiError
   */
  public static userServiceRemoveUser({
    username,
  }: {
    /**
     * Username to remove
     */
    username: string;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/user/{username}',
      path: {
        username: username,
      },
      errors: {
        401: `Not Authorized`,
        403: `Not Allowed`,
      },
    });
  }
}
