/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Access } from '../models/Access.js';
import type { Label } from '../models/Label.js';
import type { LabelInfo } from '../models/LabelInfo.js';
import type { LabelLocation } from '../models/LabelLocation.js';
import type { Schema } from '../models/Schema.js';
import type { SchemaDescriptor } from '../models/SchemaDescriptor.js';
import type { SchemaExport } from '../models/SchemaExport.js';
import type { SchemaQueryResult } from '../models/SchemaQueryResult.js';
import type { SortDirection } from '../models/SortDirection.js';
import type { Transformer } from '../models/Transformer.js';
import type { TransformerInfo } from '../models/TransformerInfo.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class SchemaService {
  /**
   * Update an existing Schema
   * @returns number Schema updated successfully
   * @throws ApiError
   */
  public static schemaServiceUpdateSchema({
    requestBody,
  }: {
    requestBody: Schema;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/schema',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve a paginated list of Schemas with available count
   * @returns SchemaQueryResult OK
   * @throws ApiError
   */
  public static schemaServiceListSchemas({
    limit,
    page,
    sort,
    direction,
    roles,
    name,
  }: {
    /**
     * limit the number of results
     */
    limit?: number;
    /**
     * filter by page number of a paginated list of Schemas starting from 1
     */
    page?: number;
    /**
     * Field name to sort results
     */
    sort?: string;
    /**
     * Sort direction
     */
    direction?: SortDirection;
    /**
     * __my, __all or a comma delimited  list of roles
     */
    roles?: string;
    name?: string;
  }): CancelablePromise<SchemaQueryResult> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema',
      query: {
        limit: limit,
        page: page,
        sort: sort,
        direction: direction,
        roles: roles,
        name: name,
      },
    });
  }
  /**
   * Save a new Schema
   * @returns number New schema created successfully
   * @throws ApiError
   */
  public static schemaServiceAddSchema({
    requestBody,
  }: {
    requestBody: Schema;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/schema',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve list of Labels for ny name. Allows users to retrieve all Label Definitions that have the same name
   * @returns LabelInfo OK
   * @throws ApiError
   */
  public static schemaServiceAllLabels({
    name,
  }: {
    /**
     * Label name
     */
    name?: string;
  }): CancelablePromise<Array<LabelInfo>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/allLabels',
      query: {
        name: name,
      },
    });
  }
  /**
   * Retrieve all transformers
   * @returns TransformerInfo OK
   * @throws ApiError
   */
  public static schemaServiceAllTransformers(): CancelablePromise<
    Array<TransformerInfo>
  > {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/allTransformers',
    });
  }
  /**
   * Retrieve a list of Schema Descriptors
   * @returns SchemaDescriptor OK
   * @throws ApiError
   */
  public static schemaServiceDescriptors({
    id,
  }: {
    /**
     * Limit to a single Schema by ID
     */
    id?: Array<number>;
  }): CancelablePromise<Array<SchemaDescriptor>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/descriptors',
      query: {
        id: id,
      },
    });
  }
  /**
   * Find all usages of a Schema by label name
   * @returns LabelLocation OK
   * @throws ApiError
   */
  public static schemaServiceFindUsages({
    label,
  }: {
    /**
     * Name of label to search for
     */
    label: string;
  }): CancelablePromise<Array<LabelLocation>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/findUsages',
      query: {
        label: label,
      },
    });
  }
  /**
   * Retrieve Schema ID by uri
   * @returns number OK
   * @throws ApiError
   */
  public static schemaServiceIdByUri({
    uri,
  }: {
    /**
     * Schema uri
     */
    uri: string;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/idByUri/{uri}',
      path: {
        uri: uri,
      },
    });
  }
  /**
   * Update an existing Schema using its previously exported version
   * @returns number Schema updated successfully using previously exported one
   * @throws ApiError
   */
  public static schemaServiceUpdateSchemaWithImport({
    requestBody,
  }: {
    requestBody: SchemaExport;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/schema/import',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Import a previously exported Schema as a new Schema
   * @returns number New Schema created successfully using previously exported one
   * @throws ApiError
   */
  public static schemaServiceAddSchemaWithImport({
    requestBody,
  }: {
    requestBody: SchemaExport;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/schema/import',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve Schema by ID
   * @returns Schema Returns Schema if a matching id is found
   * @throws ApiError
   */
  public static schemaServiceGetSchema({
    id,
  }: {
    /**
     * Schema ID to retrieve
     */
    id: number;
  }): CancelablePromise<Schema> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/{id}',
      path: {
        id: id,
      },
      errors: {
        404: `No Schema with the given id was found`,
      },
    });
  }
  /**
   * Delete a Schema by id
   * @returns void
   * @throws ApiError
   */
  public static schemaServiceDeleteSchema({
    id,
  }: {
    /**
     * Schema ID to delete
     */
    id: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/schema/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Export a Schema
   * @returns SchemaExport A JSON representation of the SchemaExport object
   * @throws ApiError
   */
  public static schemaServiceExportSchema({
    id,
  }: {
    /**
     * Schema ID
     */
    id: number;
  }): CancelablePromise<SchemaExport> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/{id}/export',
      path: {
        id: id,
      },
    });
  }
  /**
   * Update the Access configuration for a Schema
   * @returns any Created
   * @throws ApiError
   */
  public static schemaServiceUpdateSchemaAccess({
    id,
    owner,
    access,
  }: {
    /**
     * Schema ID to update Access
     */
    id: number;
    /**
     * Name of the new owner
     */
    owner: string;
    /**
     * New Access level
     */
    access: Access;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/schema/{id}/updateAccess',
      path: {
        id: id,
      },
      query: {
        owner: owner,
        access: access,
      },
    });
  }
  /**
   * Update existing Label(s) for a Schema
   * @returns number Schema updated successfully
   * @throws ApiError
   */
  public static schemaServiceUpdateLabels({
    schemaId,
    requestBody,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    requestBody: Array<Label>;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/schema/{schemaId}/labels',
      path: {
        schemaId: schemaId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve list of Labels for a Schema by Schema ID
   * @returns Label OK
   * @throws ApiError
   */
  public static schemaServiceLabels({
    schemaId,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
  }): CancelablePromise<Array<Label>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/{schemaId}/labels',
      path: {
        schemaId: schemaId,
      },
    });
  }
  /**
   * Save new Label for a Schema
   * @returns number New schema created successfully
   * @throws ApiError
   */
  public static schemaServiceAddLabels({
    schemaId,
    requestBody,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    requestBody: Array<Label>;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/schema/{schemaId}/labels',
      path: {
        schemaId: schemaId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Delete existing Label from a Schema
   * @returns void
   * @throws ApiError
   */
  public static schemaServiceDeleteLabel({
    schemaId,
    labelId,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    /**
     * Label ID
     */
    labelId: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/schema/{schemaId}/labels/{labelId}',
      path: {
        schemaId: schemaId,
        labelId: labelId,
      },
    });
  }
  /**
   * Save new or update existing Transformer definition
   * @returns number Transformer updated successfully
   * @throws ApiError
   */
  public static schemaServiceUpdateTransformer({
    schemaId,
    requestBody,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    requestBody: Transformer;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/schema/{schemaId}/transformers',
      path: {
        schemaId: schemaId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * List all Transformers defined for a Schema
   * @returns Transformer OK
   * @throws ApiError
   */
  public static schemaServiceListTransformers({
    schemaId,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
  }): CancelablePromise<Array<Transformer>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/schema/{schemaId}/transformers',
      path: {
        schemaId: schemaId,
      },
    });
  }
  /**
   * Save new or update existing Transformer definition
   * @returns number New transformer created successfully
   * @throws ApiError
   */
  public static schemaServiceAddTransformer({
    schemaId,
    requestBody,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    requestBody: Transformer;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/schema/{schemaId}/transformers',
      path: {
        schemaId: schemaId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Delete a Transformer defined for a Schema
   * @returns void
   * @throws ApiError
   */
  public static schemaServiceDeleteTransformer({
    schemaId,
    transformerId,
  }: {
    /**
     * Schema ID
     */
    schemaId: number;
    /**
     * Transformer ID
     */
    transformerId: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/schema/{schemaId}/transformers/{transformerId}',
      path: {
        schemaId: schemaId,
        transformerId: transformerId,
      },
    });
  }
}
