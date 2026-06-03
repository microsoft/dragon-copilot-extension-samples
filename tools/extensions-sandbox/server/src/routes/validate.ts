import { Router } from 'express';
import { validateToolResponse } from '../services/validation.js';
import { sessionStore } from '../store/session.js';

export const validateRouter = Router();

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
  res.status(statusCode).json(result);
});
