/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConditionComponent } from './ConditionComponent.js';
import type { JsonNode } from './JsonNode.js';
/**
 * A configuration object for Change detection models
 */
export type ConditionConfig = {
    /**
     * Name of Change detection model
     */
    name: string;
    /**
     * UI name for change detection model
     */
    title: string;
    /**
     * Change detection model description
     */
    description: string;
    /**
     * A list of UI components for dynamically building the UI components
     */
    ui: Array<ConditionComponent>;
    /**
     * A dictionary of UI default configuration items for dynamically building the UI components
     */
    defaults?: Record<string, JsonNode>;
};

