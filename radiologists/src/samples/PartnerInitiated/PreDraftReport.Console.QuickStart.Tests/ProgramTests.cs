using System.Diagnostics.CodeAnalysis;
using System.Text;
using Xunit;

namespace PreDraftReport.Console.QuickStart.Tests;

/// <summary>
/// Covers the exit code contract the README relies on, and the payload loading failures.
/// </summary>
public sealed class ProgramTests : IDisposable
{
    private const string ValidPayload = """
        {
          "manifestName": "sampleRadiologyExtension",
          "toolName": "preDraftReportGeneratorTool",
          "draftReport": {
            "identifier": "a25c4954-a7f7-49f0-a4a2-98d354d60705",
            "aiSystemInfo": { "version": "1.2.0" },
            "imagingStudy": {
              "studyUid": "2.25.329391862910276348519548604004805820309",
              "accessionNumber": "ACC-0000001"
            },
            "reportContent": { "format": "structured_report" }
          }
        }
        """;

    private readonly string _directory = Directory.CreateTempSubdirectory("pre-draft-report-tests").FullName;
    private readonly StringBuilder _output = new();
    private readonly StringWriter _writer;

    [SuppressMessage("Usage", "CA2213:Disposable fields should be disposed", Justification = "Console.Out belongs to the runtime; this type only restores it.")]
    private readonly TextWriter _originalOut;

    public ProgramTests()
    {
        _writer = new StringWriter(_output);
        _originalOut = System.Console.Out;
        System.Console.SetOut(_writer);
    }

    public void Dispose()
    {
        System.Console.SetOut(_originalOut);
        _writer.Dispose();
        Directory.Delete(_directory, recursive: true);
    }

    [Fact]
    public void MainReturnsZeroForAValidPayload()
    {
        var path = WritePayload(ValidPayload);

        Assert.Equal(0, Run(path));
    }

    [Fact]
    public void MainPrintsTheBodyItWouldPost()
    {
        var path = WritePayload(ValidPayload);

        Run(path);

        Assert.Contains("draft-report-ai-results", Output, StringComparison.Ordinal);
        Assert.Contains("\"manifestName\": \"sampleRadiologyExtension\"", Output, StringComparison.Ordinal);
    }

    [Fact]
    public void MainReturnsOneWhenThePayloadFileIsMissing()
    {
        var missing = Path.Combine(_directory, "does-not-exist.json");

        Assert.Equal(1, Run(missing));
        Assert.Contains("Payload not found", Output, StringComparison.Ordinal);
    }

    [Fact]
    public void MainReturnsOneWhenThePayloadIsNotValidJson()
    {
        var path = WritePayload("{ this is not json");

        Assert.Equal(1, Run(path));
        Assert.Contains("not valid JSON", Output, StringComparison.Ordinal);
    }

    [Fact]
    public void MainReturnsOneWhenThePayloadIsEmpty()
    {
        var path = WritePayload("null");

        Assert.Equal(1, Run(path));
        Assert.Contains("is empty", Output, StringComparison.Ordinal);
    }

    [Fact]
    public void MainReturnsOneAndListsProblemsWhenThePayloadFailsValidation()
    {
        var path = WritePayload("""{ "draftReport": { } }""");

        Assert.Equal(1, Run(path));
        Assert.Contains("manifestName", Output, StringComparison.Ordinal);
        Assert.Contains("toolName", Output, StringComparison.Ordinal);
    }

    [Fact]
    public void MainThrowsWhenArgsIsNull()
    {
        Assert.Throws<ArgumentNullException>(() => Program.Main(null!));
    }

    private string Output => _output.ToString();

    private string WritePayload(string json)
    {
        var path = Path.Combine(_directory, $"{Guid.NewGuid()}.json");
        File.WriteAllText(path, json);
        return path;
    }

    private int Run(string payloadPath)
    {
        _output.Clear();
        return Program.Main([payloadPath]);
    }
}
