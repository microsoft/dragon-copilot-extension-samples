#!/usr/bin/env npx tsx
/**
 * Mock Extension Server
 *
 * Brings up a dummy HTTP service that implements the Dragon Copilot (radiologists)
 * Extension API contract (/v1/process) for both test fixture manifests:
 *
 *   1. valid-manifest-simple.json   → tool "chestCtQuality" (capability: qualityCheck)
 *   2. valid-manifest-full-featured.json → tool "brainMriQuality" (capability: qualityCheck)
 *
 * Usage:
 *   npx tsx server/scripts/mock-extension-server.ts [--port 9100]
 *
 * The sandbox manifest endpoint fields should point to:
 *   http://localhost:9100/v1/process
 */

import http from 'node:http';

const PORT = Number(process.argv.find((_, i, arr) => arr[i - 1] === '--port') ?? 9100);

// ─── Sample Quality Check Responses ─────────────────────────────────────────

interface Recommendation {
  qualityCheckType: 'Billing' | 'Clinical';
  description: string;
  reason: string;
  severityScorePercent?: number;
  provenance?: { text: string; startPosition: number; endPosition: number }[];
  referenceResources?: { type: string; content: string }[];
}

function generateChestCtRecommendations(reportText: string): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!reportText.toLowerCase().includes('comparison')) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Missing comparison with prior studies',
      reason: 'No comparison section found in report. Comparison with prior imaging improves diagnostic accuracy.',
      severityScorePercent: 55,
      provenance: [{ text: reportText.slice(0, 60), startPosition: 0, endPosition: Math.min(60, reportText.length) }],
    });
  }

  if (!reportText.toLowerCase().includes('impression')) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Missing impression section',
      reason: 'An impression/conclusion section is recommended for chest CT reports.',
      severityScorePercent: 70,
    });
  }

  if (reportText.toLowerCase().includes('bilateral')) {
    recommendations.push({
      qualityCheckType: 'Billing',
      description: 'Missing CPT modifier for bilateral procedure',
      reason: 'Bilateral finding described but modifier -50 not referenced.',
      severityScorePercent: 75,
      referenceResources: [
        { type: 'url', content: 'https://www.ama-assn.org/practice-management/cpt' },
      ],
    });
  }

  // Always return at least one recommendation for demo purposes
  if (recommendations.length === 0) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Report appears complete',
      reason: 'No significant quality issues detected. Report follows standard radiology structure.',
      severityScorePercent: 10,
    });
  }

  return recommendations;
}

function generateBrainMriRecommendations(reportText: string, _patientInfo?: unknown): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!reportText.toLowerCase().includes('diffusion')) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Diffusion-weighted imaging (DWI) findings not mentioned',
      reason: 'DWI is standard for brain MRI. Consider documenting DWI sequences and findings.',
      severityScorePercent: 60,
    });
  }

  if (!reportText.toLowerCase().includes('ventricle')) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Ventricular size not addressed',
      reason: 'Assessment of ventricular system is expected in brain MRI reports.',
      severityScorePercent: 45,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      qualityCheckType: 'Clinical',
      description: 'Report is comprehensive',
      reason: 'Brain MRI report covers key anatomical structures and sequences.',
      severityScorePercent: 5,
    });
  }

  return recommendations;
}

// ─── Request Handling ────────────────────────────────────────────────────────

interface ToolRequest {
  toolName: string;
  toolRequestId: string;
  inputs: Record<string, unknown>;
}

interface ExtensionRequest {
  requestId: string;
  customerTenantId: string;
  tools: ToolRequest[];
}

function handleProcess(body: ExtensionRequest) {
  if (body.tools && body.tools.length > 1) {
    console.warn(`⚠️  Request contains ${body.tools.length} tools but mock server only processes the first.`);
  }

  const toolReq = body.tools?.[0];
  if (!toolReq) {
    return { status: 400, body: { success: false, error: 'No tool request provided.' } };
  }

  const { toolName, toolRequestId, inputs } = toolReq;

  // Extract report text from inputs (handles both string and object forms)
  let reportText = '';
  const reportInput = inputs.report;
  if (typeof reportInput === 'string') {
    reportText = reportInput;
  } else if (reportInput && typeof reportInput === 'object') {
    reportText = (reportInput as { reportText?: string }).reportText ?? JSON.stringify(reportInput);
  }

  let recommendations: Recommendation[];

  switch (toolName) {
    case 'chestCtQuality':
      recommendations = generateChestCtRecommendations(reportText);
      break;
    case 'brainMriQuality':
      recommendations = generateBrainMriRecommendations(reportText, inputs['patient-info']);
      break;
    default:
      return {
        status: 404,
        body: { success: false, error: `Unknown tool: ${toolName}. Supported: chestCtQuality, brainMriQuality` },
      };
  }

  // Return the ExtensionResponse envelope
  return {
    status: 200,
    body: {
      requestId: body.requestId,
      tools: [
        {
          toolName,
          toolRequestId,
          outputs: {
            'quality-result': { recommendations },
          },
        },
      ],
    },
  };
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', tools: ['chestCtQuality', 'brainMriQuality'] }));
    return;
  }

  // Main endpoint
  if (req.method === 'POST' && req.url === '/v1/process') {
    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(rawBody) as ExtensionRequest;
        const result = handleProcess(parsed);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body, null, 2));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Use POST /v1/process or GET /health' }));
});

server.listen(PORT, () => {
  console.log(`\n🩺 Mock Extension Server running on http://localhost:${PORT}`);
  console.log(`\n   Endpoints:`);
  console.log(`     POST http://localhost:${PORT}/v1/process  — Extension processing`);
  console.log(`     GET  http://localhost:${PORT}/health      — Health check`);
  console.log(`\n   Supported tools:`);
  console.log(`     • chestCtQuality  (from valid-manifest-simple.json)`);
  console.log(`     • brainMriQuality (from valid-manifest-full-featured.json)`);
  console.log(`\n   Update your manifest endpoint to: http://localhost:${PORT}/v1/process`);
  console.log(`\n   Press Ctrl+C to stop.\n`);
});
