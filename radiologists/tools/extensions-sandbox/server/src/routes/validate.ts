import { Router } from 'express';
import { validateToolResponse, validateToolInputs } from '../services/validation.js';
import { sessionStore } from '../store/session.js';
import { createLogger } from '../utils/logger.js';

export const validateRouter = Router();

const log = createLogger('validate');

/**
 * GET /api/validate/results
 * Returns all stored validation results for the current session.
 * NOTE: Fixed-path routes must be registered before the /:toolName wildcard.
 */
validateRouter.get('/results', (_req, res) => {
  const results = sessionStore.getValidationResults();
  res.json({
    count: results.length,
    results,
  });
});

/**
 * DELETE /api/validate/results
 * Clears all stored validation results.
 */
validateRouter.delete('/results', (_req, res) => {
  sessionStore.clearValidationResults();
  res.json({ message: 'Validation results cleared.' });
});

/**
 * POST /api/validate/inputs/:toolName
 * Validates tool input data against the expected input schemas
 * based on the content-types declared in the manifest.
 *
 * Body: { "inputs": { "<inputName>": <parsed input data>, ... } }
 */
validateRouter.post('/inputs/:toolName', (req, res) => {
  const { toolName } = req.params;

  if (!req.body || !('inputs' in req.body)) {
    res.status(400).json({
      error: "Request body must contain an 'inputs' field with a map of input name to input data.",
      example: { inputs: { report: { reportText: "..." } } },
    });
    return;
  }

  const inputs: Record<string, unknown> = req.body.inputs;
  const results = validateToolInputs(toolName, inputs);

  const allValid = results.every((r) => r.valid);
  const statusCode = allValid ? 200 : 422;

  if (allValid) {
    log.info(`Input validation for tool '${toolName}': VALID (${results.length} input(s)).`);
  } else {
    const failed = results.filter((r) => !r.valid).length;
    log.warn(
      `Input validation for tool '${toolName}': INVALID — ${failed} of ${results.length} input(s) failed (422).`,
    );
  }

  res.status(statusCode).json({
    valid: allValid,
    toolName,
    results,
  });
});

/**
 * POST /api/validate/:toolName
 * Validates a tool execution response against the expected output schema.
 *
 * Body: { "response": <actual response payload> }
 */
validateRouter.post('/:toolName', (req, res) => {
  const { toolName } = req.params;

  // Validate request envelope
  if (!req.body || !('response' in req.body)) {
    res.status(400).json({
      error: "Request body must contain a 'response' field with the tool execution payload.",
      example: { response: { recommendations: [] } },
    });
    return;
  }

  const responsePayload: unknown = req.body.response;
  const result = validateToolResponse(toolName, responsePayload);

  // Store result in session for report aggregation
  sessionStore.addValidationResult(result);

  const statusCode = result.valid ? 200 : 422;
  if (result.valid) {
    log.info(`Response validation for tool '${toolName}': VALID.`);
  } else {
    log.warn(`Response validation for tool '${toolName}': INVALID (422).`);
  }
  res.status(statusCode).json(result);
});
