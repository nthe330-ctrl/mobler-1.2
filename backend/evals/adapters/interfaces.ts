/**
 * MOBLER SEARCH - EVAL HARNESS ADAPTER INTERFACES
 * Pluggable provider interfaces for Intent, Location, Plan, Retrieval, and E2E Pipeline.
 */

import {
  SearchIntent,
  LocationIntent
} from '../../server/search/contract/types';
import {
  EvalContext,
  AdapterRunOptions,
  QueryPlanResult,
  RetrievalResult,
  PipelineExecutionResult
} from '../types';

export interface IntentProvider {
  name: string;
  version: string;
  provideIntent(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<SearchIntent>;
}

export interface LocationProvider {
  name: string;
  version: string;
  resolveLocation(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<LocationIntent | null>;
}

export interface PlanProvider {
  name: string;
  version: string;
  createPlan(intent: SearchIntent, context?: EvalContext, options?: AdapterRunOptions): Promise<QueryPlanResult>;
}

export interface RetrievalProvider {
  name: string;
  version: string;
  retrieve(planOrIntent: QueryPlanResult | SearchIntent, options?: AdapterRunOptions): Promise<RetrievalResult>;
}

export interface PipelineProvider {
  name: string;
  version: string;
  execute(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<PipelineExecutionResult>;
}
