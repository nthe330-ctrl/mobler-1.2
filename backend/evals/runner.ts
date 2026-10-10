/**
 * MOBLER SEARCH - EVALUATION RUNNER
 * Orchestrates test execution against datasets, collects metrics, enforces safety caps,
 * and saves versioned, compliant run artifacts to evals/results/<run_id>.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  EvalDataset,
  EvalCaseResult,
  EvalRunResult,
  AdapterExecutionMode,
  AdapterRunOptions
} from './types';
import { IntentProvider, RetrievalProvider, PipelineProvider } from './adapters/interfaces';
import { DatasetLoader } from './datasets/loader';
import { EvalMetricCalculator } from './metrics/evaluator';

export interface RunnerOptions {
  datasetPath?: string;
  dataset?: EvalDataset;
  intentProvider?: IntentProvider;
  retrievalProvider?: RetrievalProvider;
  pipelineProvider?: PipelineProvider;
  mode?: AdapterExecutionMode;
  allowLiveMode?: boolean;
  maxQueryCount?: number;
  maxEstimatedCostUsd?: number;
  runId?: string;
  outputDir?: string;
  writeResultsToFile?: boolean;
}

export class EvalRunner {
  public static async run(options: RunnerOptions): Promise<EvalRunResult> {
    const mode = options.mode || 'mock';

    // 1. Guard live mode: strictly requires explicit allowLiveMode: true flag
    if (mode === 'live' && !options.allowLiveMode) {
      throw new Error('Live mode is disabled by default. Requires explicit allowLiveMode: true flag.');
    }

    // 2. Load dataset
    let dataset: EvalDataset;
    let datasetHash: string;

    if (options.dataset) {
      dataset = options.dataset;
      datasetHash = DatasetLoader.computeDatasetHash(dataset);
    } else {
      const defaultPath = options.datasetPath || path.resolve(__dirname, 'datasets/dataset_v1.0.json');
      const loaded = DatasetLoader.loadDataset(defaultPath);
      dataset = loaded.dataset;
      datasetHash = loaded.hash;
    }

    const runId = options.runId || `run_${Date.now()}_${mode}`;
    const adapterOptions: AdapterRunOptions = {
      mode,
      allowLiveMode: options.allowLiveMode,
      maxQueryCount: options.maxQueryCount ?? 10,
      maxEstimatedCostUsd: options.maxEstimatedCostUsd ?? 0.50
    };

    const caseResults: EvalCaseResult[] = [];
    const casesToRun = options.maxQueryCount ? dataset.cases.slice(0, options.maxQueryCount) : dataset.cases;

    // 3. Execute each case through the adapter
    for (const testCase of casesToRun) {
      const startTime = Date.now();
      let actualIntent: any = undefined;
      let actualRetrieval: any = undefined;
      let crashed = false;
      let crashError: string | undefined = undefined;

      try {
        if (options.pipelineProvider) {
          const pipelineRes = await options.pipelineProvider.execute(testCase.query, testCase.context, adapterOptions);
          actualIntent = pipelineRes.intent;
          actualRetrieval = pipelineRes.retrieval;
          if (pipelineRes.crashed) {
            crashed = true;
            crashError = pipelineRes.crash_error;
          }
        } else if (options.intentProvider) {
          actualIntent = await options.intentProvider.provideIntent(testCase.query, testCase.context, adapterOptions);
          if (options.retrievalProvider) {
            actualRetrieval = await options.retrievalProvider.retrieve(actualIntent, adapterOptions);
          }
        } else {
          throw new Error('No IntentProvider or PipelineProvider provided to EvalRunner');
        }
      } catch (err: any) {
        crashed = true;
        crashError = err?.message || String(err);
      }

      const elapsed = Date.now() - startTime;

      const evalResult = EvalMetricCalculator.evaluateCase(testCase, {
        intent: actualIntent,
        retrieval: actualRetrieval,
        latency_ms: elapsed,
        crashed,
        crash_error: crashError
      });

      caseResults.push(evalResult);
    }

    // 4. Compute summaries
    const adaptersUsed = {
      intent: options.intentProvider?.name,
      retrieval: options.retrievalProvider?.name,
      pipeline: options.pipelineProvider?.name
    };

    const summary = EvalMetricCalculator.summarizeRun(
      runId,
      dataset.dataset_version,
      datasetHash,
      casesToRun,
      caseResults,
      adaptersUsed,
      mode
    );

    const runResult: EvalRunResult = {
      summary,
      case_results: caseResults
    };

    // 5. Persist run artifact if enabled
    if (options.writeResultsToFile !== false) {
      const outDir = options.outputDir || path.resolve(__dirname, 'results');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const outFilePath = path.join(outDir, `${runId}.json`);
      fs.writeFileSync(outFilePath, JSON.stringify(runResult, null, 2), 'utf-8');
    }

    return runResult;
  }
}
