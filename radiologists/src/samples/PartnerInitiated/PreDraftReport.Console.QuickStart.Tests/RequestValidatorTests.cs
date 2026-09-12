using System.Collections.ObjectModel;
using Dragon.Copilot.Radiologists.Models;
using PreDraftReport.Console.QuickStart.Services;
using Xunit;

namespace PreDraftReport.Console.QuickStart.Tests;

public class RequestValidatorTests
{
    [Fact]
    public void ValidateReturnsNoProblemsForAWellFormedRequest()
    {
        var problems = RequestValidator.Validate(CreateValidRequest());

        Assert.Empty(problems);
    }

    [Theory]
    [InlineData("101", null, null)]
    [InlineData(null, "202", null)]
    [InlineData(null, null, "303")]
    [InlineData("101", "202", null)]
    [InlineData("101", null, "303")]
    [InlineData(null, "202", "303")]
    public void ValidateRejectsAPartialMarketplaceTriple(string? publisherId, string? offerId, string? planId)
    {
        var request = CreateValidRequest();
        request.PublisherId = publisherId;
        request.OfferId = offerId;
        request.PlanId = planId;

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("publisherId", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateAcceptsACompleteMarketplaceTriple()
    {
        var request = CreateValidRequest();
        request.PublisherId = "101";
        request.OfferId = "202";
        request.PlanId = "303";

        var problems = RequestValidator.Validate(request);

        Assert.Empty(problems);
    }

    [Fact]
    public void ValidateRequiresAnAccessionNumberBecauseItResolvesTheOrder()
    {
        var request = CreateValidRequest();
        request.DraftReport.ImagingStudy.AccessionNumber = null!;

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("accessionNumber", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRequiresAnIdentifierBecauseItMakesRetriesSafe()
    {
        var request = CreateValidRequest();
        request.DraftReport.Identifier = "";

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("identifier", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRequiresAStudyUid()
    {
        var request = CreateValidRequest();
        request.DraftReport.ImagingStudy.StudyUid = null!;

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("studyUid", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRequiresAnAiSystemVersion()
    {
        var request = CreateValidRequest();
        request.DraftReport.AISystemInfo.Version = null!;

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("aiSystemInfo.version", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRejectsAMissingDraftReport()
    {
        var request = CreateValidRequest();
        request.DraftReport = null!;

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("draftReport is required", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateThrowsWhenTheRequestIsNull()
    {
        Assert.Throws<ArgumentNullException>(() => RequestValidator.Validate(null!));
    }

    [Fact]
    public void ValidateReportsEveryMissingRequiredFieldAtOnce()
    {
        var request = new PreDraftReportIngestRequest
        {
            DraftReport = new Dragon.Copilot.Radiologists.Models.PreDraftReport(),
        };

        var problems = RequestValidator.Validate(request);

        Assert.Contains(problems, p => p.Contains("manifestName", StringComparison.Ordinal));
        Assert.Contains(problems, p => p.Contains("toolName", StringComparison.Ordinal));
        Assert.Contains(problems, p => p.Contains("identifier", StringComparison.Ordinal));
        Assert.Contains(problems, p => p.Contains("aiSystemInfo", StringComparison.Ordinal));
        Assert.Contains(problems, p => p.Contains("imagingStudy", StringComparison.Ordinal));
        Assert.Contains(problems, p => p.Contains("reportContent", StringComparison.Ordinal));
    }

    private static PreDraftReportIngestRequest CreateValidRequest() => new()
    {
        ManifestName = "sampleRadiologyExtension",
        ToolName = "preDraftReportGeneratorTool",
        DraftReport = new Dragon.Copilot.Radiologists.Models.PreDraftReport
        {
            Identifier = "a25c4954-a7f7-49f0-a4a2-98d354d60705",
            AISystemInfo = new AISystemInfo { Version = "1.2.0" },
            ImagingStudy = new ImagingStudy
            {
                StudyUid = "2.25.329391862910276348519548604004805820309",
                AccessionNumber = "ACC-0000001",
            },
            ReportContent = new ReportContent
            {
                Format = "structured_report",
                StructuredReport = new StructuredReport
                {
                    Format = "plain_text",
                    Sections = new Collection<Section>
                    {
                        new() { Name = "impression", Content = "No acute cardiopulmonary abnormality." },
                    },
                },
            },
        },
    };
}
