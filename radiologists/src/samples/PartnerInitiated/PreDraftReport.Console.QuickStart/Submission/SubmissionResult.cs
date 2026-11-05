using System.Net;

namespace PreDraftReport.Console.QuickStart.Submission;

/// <summary>
/// What Dragon Copilot returned for a submission.
/// </summary>
/// <param name="StatusCode">The HTTP status code.</param>
/// <param name="Reason">The machine-readable reason that 404 and 409 responses carry, otherwise null.</param>
/// <param name="Body">The raw response body. Empty for 200.</param>
/// <param name="CorrelationId">The <c>x-ms-correlation-id</c> response header.</param>
public sealed record SubmissionResult(HttpStatusCode StatusCode, string? Reason, string Body, string? CorrelationId);
