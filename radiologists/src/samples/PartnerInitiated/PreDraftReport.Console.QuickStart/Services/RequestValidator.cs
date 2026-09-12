using Dragon.Copilot.Radiologists.Models;

namespace PreDraftReport.Console.QuickStart.Services;

/// <summary>
/// Checks a request against the rules in pre-draft-report-ingest-request-schema.json that a
/// partner can get wrong locally, so mistakes surface before a round trip.
/// </summary>
/// <remarks>
/// This is a structural check, not full JSON Schema validation. The service is still the authority
/// and will reject anything this misses with 400 Bad Request.
/// </remarks>
public static class RequestValidator
{
    /// <summary>
    /// Validates a request.
    /// </summary>
    /// <param name="request">The request to check.</param>
    /// <returns>A description of each problem found, empty when the request looks well formed.</returns>
    public static IReadOnlyList<string> Validate(PreDraftReportIngestRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var problems = new List<string>();

        Require(problems, "manifestName", request.ManifestName);
        Require(problems, "toolName", request.ToolName);

        // The marketplace triple is all or nothing. A partial triple cannot identify an offer, and
        // side-loaded extensions have no triple at all.
        var triple = new[] { request.PublisherId, request.OfferId, request.PlanId };
        var supplied = triple.Count(value => !string.IsNullOrWhiteSpace(value));
        if (supplied is > 0 and < 3)
        {
            problems.Add("publisherId, offerId and planId must be supplied together or omitted together.");
        }

        var report = request.DraftReport;
        if (report is null)
        {
            problems.Add("draftReport is required.");
            return problems;
        }

        Require(problems, "draftReport.identifier", report.Identifier);

        if (report.AISystemInfo is null)
        {
            problems.Add("draftReport.aiSystemInfo is required.");
        }
        else
        {
            Require(problems, "draftReport.aiSystemInfo.version", report.AISystemInfo.Version);
        }

        if (report.ImagingStudy is null)
        {
            problems.Add("draftReport.imagingStudy is required.");
        }
        else
        {
            Require(problems, "draftReport.imagingStudy.studyUid", report.ImagingStudy.StudyUid);

            // The accession number is how the service finds the order to attach the report to.
            // Without it the submission cannot be resolved and comes back 404.
            Require(problems, "draftReport.imagingStudy.accessionNumber", report.ImagingStudy.AccessionNumber);
        }

        if (report.ReportContent is null)
        {
            problems.Add("draftReport.reportContent is required.");
        }

        return problems;
    }

    private static void Require(List<string> problems, string name, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            problems.Add($"{name} is required.");
        }
    }
}
