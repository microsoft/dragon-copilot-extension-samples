using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace PreDraftReport.Console.QuickStart.Simulation;

/// <summary>
/// Validates a submission the way Dragon Copilot does before it looks anything up: the route's
/// customer tenant and environment IDs, and every rule on the request body.
/// </summary>
/// <remarks>
/// The status code and the shape of the errors match Dragon Copilot. The wording of an individual
/// error message can differ.
/// </remarks>
public static partial class SimulatedRequestValidator
{
    private const string BodyKey = "draftReportRequestDto";
    private const string BodyRequired = "The draftReportRequestDto field is required.";

    private static readonly JsonNodeOptions NodeOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly string[] ReportContentFormats = ["structured_report"];
    private static readonly string[] StructuredReportFormats = ["plain_text", "markdown"];
    private static readonly string[] CodeSystems = ["SNOMED-CT", "ICD-10", "ICD-11", "RadLex", "LOINC", "CPT"];

    /// <summary>
    /// Validates a submission.
    /// </summary>
    /// <param name="customerTenantId">The customer tenant ID from the route.</param>
    /// <param name="environmentId">The environment ID from the route.</param>
    /// <param name="body">The request body.</param>
    /// <returns>The validation errors, and the parsed body when there are none.</returns>
    public static SubmissionValidation Validate(string customerTenantId, string environmentId, string? body)
    {
        var errors = new ErrorCollector();
        CheckRouteGuid(errors, "tenantId", customerTenantId);
        CheckRouteGuid(errors, "environmentId", environmentId);

        if (string.IsNullOrWhiteSpace(body))
        {
            errors.AddBody(string.Empty, "A non-empty request body is required.");
            errors.AddBody(BodyKey, BodyRequired);
            return errors.ToValidation(null);
        }

        JsonObject request;
        try
        {
            switch (JsonNode.Parse(body, NodeOptions))
            {
                case JsonObject parsed:
                    request = parsed;
                    break;
                case null:
                    errors.AddBody(BodyKey, BodyRequired);
                    return errors.ToValidation(null);
                default:
                    errors.TypeError("$", "DraftReportIngestRequest");
                    return errors.ToValidation(null);
            }

            new BodyChecker(errors).CheckRequest(request);
        }
        catch (JsonException ex)
        {
            errors.AddBody("$", ex.Message);
            errors.AddBody(BodyKey, BodyRequired);
            return errors.ToValidation(null);
        }
        catch (ArgumentException ex)
        {
            // Raised for a property that appears twice, for example with different casing.
            errors.AddBody("$", ex.Message);
            errors.AddBody(BodyKey, BodyRequired);
            return errors.ToValidation(null);
        }

        return errors.ToValidation(request);
    }

    [GeneratedRegex("^[a-z][a-zA-Z0-9]*$")]
    private static partial Regex CamelCasePattern();

    [GeneratedRegex(@"^\d+\.\d+\.\d+$")]
    private static partial Regex VersionPattern();

    [GeneratedRegex("^[a-z][a-z_]*$")]
    private static partial Regex SectionNamePattern();

    private static void CheckRouteGuid(ErrorCollector errors, string name, string value)
    {
        if (!Guid.TryParseExact(value, "D", out var guid) || guid == Guid.Empty)
        {
            errors.AddRoute(name, $"{name} must be a valid non-empty GUID.");
        }
    }

    /// <summary>
    /// Walks the body in the order Dragon Copilot validates it, recording each rule it breaks.
    /// </summary>
    private sealed class BodyChecker(ErrorCollector errors)
    {
        public void CheckRequest(JsonObject request)
        {
            var publisherId = String(request, "publisherId", "$")?.Trim();
            var offerId = String(request, "offerId", "$")?.Trim();
            var planId = String(request, "planId", "$")?.Trim();
            MarketplaceId(publisherId, "PublisherId");
            MarketplaceId(offerId, "OfferId");
            MarketplaceId(planId, "PlanId");

            CamelCaseName(String(request, "manifestName", "$")?.Trim(), "ManifestName");

            var version = String(request, "version", "$")?.Trim();
            if (version is not null)
            {
                Pattern(version, VersionPattern(), "Version", "The Version must be in x.y.z form.");
                MaxLength(version, 64, "Version");
                NoControlCharacters(version, "Version");
            }

            CamelCaseName(String(request, "toolName", "$")?.Trim(), "ToolName");

            var draftReport = Object(request, "draftReport", "$", "DraftReport");
            if (Required(draftReport, "DraftReport", "DraftReport"))
            {
                CheckDraftReport(draftReport!, "DraftReport", "$.draftReport");
            }

            // The Marketplace IDs are checked together only once every property is valid.
            if (!errors.HasBodyErrors)
            {
                var supplied = new[] { publisherId, offerId, planId }.Count(id => !string.IsNullOrWhiteSpace(id));
                if (supplied is > 0 and < 3)
                {
                    errors.AddBody(
                        "MarketplaceExtensionIdentifiers",
                        "PublisherId, OfferId and PlanId must be supplied together or omitted together.");
                }
            }
        }

        private void CheckDraftReport(JsonObject report, string key, string path)
        {
            RequiredText(String(report, "identifier", path), $"{key}.Identifier", "Identifier");
            String(report, "category", path);
            String(report, "code", path);

            var aiSystemInfo = Object(report, "aiSystemInfo", path, "AISystemInfo");
            if (Required(aiSystemInfo, $"{key}.AISystemInfo", "AISystemInfo"))
            {
                RequiredText(String(aiSystemInfo!, "version", $"{path}.aiSystemInfo"), $"{key}.AISystemInfo.Version", "Version");
            }

            var imagingStudy = Object(report, "imagingStudy", path, "ImagingStudy");
            if (Required(imagingStudy, $"{key}.ImagingStudy", "ImagingStudy"))
            {
                CheckImagingStudy(imagingStudy!, $"{key}.ImagingStudy", $"{path}.imagingStudy");
            }

            var priors = Array(report, "imagingStudyPriors", path);
            for (var i = 0; priors is not null && i < priors.Count; i++)
            {
                var priorPath = $"{path}.imagingStudyPriors[{i}]";
                if (Element(priors, i, priorPath, "ImagingStudyPrior") is { } prior)
                {
                    RequiredText(String(prior, "studyUid", priorPath), $"{key}.ImagingStudyPriors[{i}].StudyUid", "StudyUid");
                    String(prior, "studyDateTime", priorPath);
                    String(prior, "modality", priorPath);
                }
            }

            var reportContent = Object(report, "reportContent", path, "ReportContent");
            if (Required(reportContent, $"{key}.ReportContent", "ReportContent"))
            {
                CheckReportContent(reportContent!, $"{key}.ReportContent", $"{path}.reportContent");
            }

            if (Object(report, "qualityMetrics", path, "QualityMetrics") is { } qualityMetrics)
            {
                CheckQualityMetrics(qualityMetrics, $"{key}.QualityMetrics", $"{path}.qualityMetrics");
            }
        }

        private void CheckImagingStudy(JsonObject study, string key, string path)
        {
            RequiredText(String(study, "studyUid", path), $"{key}.StudyUid", "StudyUid");

            var series = Array(study, "series", path);
            for (var i = 0; series is not null && i < series.Count; i++)
            {
                var seriesPath = $"{path}.series[{i}]";
                if (Element(series, i, seriesPath, "Series") is { } item)
                {
                    String(item, "seriesUid", seriesPath);
                    StringArray(item, "instanceUids", seriesPath);
                }
            }

            RequiredText(String(study, "accessionNumber", path), $"{key}.AccessionNumber", "AccessionNumber");
            String(study, "patientMrn", path);
            String(study, "modality", path);
            StringArray(study, "bodyParts", path);
            String(study, "procedureCode", path);
            String(study, "studyDateTime", path);
        }

        private void CheckReportContent(JsonObject content, string key, string path)
        {
            var format = String(content, "format", path);
            RequiredText(format, $"{key}.Format", "Format");
            Allowed(format, ReportContentFormats, $"{key}.Format", "Format");

            var structuredReport = Object(content, "structuredReport", path, "StructuredReport");
            if (Required(structuredReport, $"{key}.StructuredReport", "StructuredReport"))
            {
                CheckStructuredReport(structuredReport!, $"{key}.StructuredReport", $"{path}.structuredReport");
            }
        }

        private void CheckStructuredReport(JsonObject report, string key, string path)
        {
            var format = String(report, "format", path);
            RequiredText(format, $"{key}.Format", "Format");
            Allowed(format, StructuredReportFormats, $"{key}.Format", "Format");

            var sections = Array(report, "sections", path);
            if (!Required(sections, $"{key}.Sections", "Sections"))
            {
                return;
            }

            for (var i = 0; i < sections!.Count; i++)
            {
                var sectionPath = $"{path}.sections[{i}]";
                if (Element(sections, i, sectionPath, "Section") is { } section)
                {
                    CheckSection(section, $"{key}.Sections[{i}]", sectionPath);
                }
            }
        }

        private void CheckSection(JsonObject section, string key, string path)
        {
            var name = String(section, "name", path);
            RequiredText(name, $"{key}.Name", "Name");
            if (!string.IsNullOrEmpty(name))
            {
                Pattern(name, SectionNamePattern(), $"{key}.Name", "The field Name must match the regular expression '^[a-z][a-z_]*$'.");
            }

            RequiredText(String(section, "content", path), $"{key}.Content", "Content");
            RequiredValue(Boolean(section, "aiGenerated", path), $"{key}.AiGenerated", "AiGenerated");

            var aiConfidence = Number(section, "aiConfidence", path, allowNull: false);
            if (RequiredValue(aiConfidence, $"{key}.AiConfidence", "AiConfidence"))
            {
                Range(aiConfidence!.Value, 0, 1, $"{key}.AiConfidence", "AiConfidence");
            }

            var sectionOrder = Integer(section, "sectionOrder", path);
            if (RequiredValue(sectionOrder, $"{key}.SectionOrder", "SectionOrder"))
            {
                Range(sectionOrder!.Value, 1, int.MaxValue, $"{key}.SectionOrder", "SectionOrder");
            }

            var codes = Array(section, "codes", path);
            for (var i = 0; codes is not null && i < codes.Count; i++)
            {
                var codePath = $"{path}.codes[{i}]";
                if (Element(codes, i, codePath, "Code") is { } code)
                {
                    var codeKey = $"{key}.Codes[{i}]";
                    var system = String(code, "system", codePath);
                    RequiredText(system, $"{codeKey}.System", "System");
                    Allowed(system, CodeSystems, $"{codeKey}.System", "System");
                    RequiredText(String(code, "code", codePath), $"{codeKey}.Code", "Code");
                    RequiredText(String(code, "display", codePath), $"{codeKey}.Display", "Display");
                }
            }
        }

        private void CheckQualityMetrics(JsonObject metrics, string key, string path)
        {
            if (Number(metrics, "overallConfidenceScore", path, allowNull: true) is { } overall)
            {
                Range(overall, 0, 1, $"{key}.OverallConfidenceScore", "OverallConfidenceScore");
            }

            var imageQuality = Number(metrics, "imageQualityScore", path, allowNull: false);
            if (RequiredValue(imageQuality, $"{key}.ImageQualityScore", "ImageQualityScore"))
            {
                Range(imageQuality!.Value, 0, 1, $"{key}.ImageQualityScore", "ImageQualityScore");
            }

            if (Number(metrics, "diagnosticCertaintyScore", path, allowNull: true) is { } certainty)
            {
                Range(certainty, 0, 1, $"{key}.DiagnosticCertaintyScore", "DiagnosticCertaintyScore");
            }
        }

        private void CamelCaseName(string? value, string name)
        {
            RequiredText(value, name, name);
            if (value is null)
            {
                return;
            }

            MaxLength(value, 256, name);
            if (value.Length > 0)
            {
                Pattern(value, CamelCasePattern(), name, $"The {name} must be camelCase and contain only letters and digits.");
            }

            NoControlCharacters(value, name);
        }

        private void MarketplaceId(string? value, string name)
        {
            if (value is null)
            {
                return;
            }

            if (value.Length is < 1 or > 256)
            {
                errors.AddBody(name, $"The field {name} must be a string with a minimum length of 1 and a maximum length of 256.");
            }

            NoControlCharacters(value, name);
        }

        private bool Required(JsonNode? value, string key, string name)
        {
            if (value is not null)
            {
                return true;
            }

            errors.AddBody(key, $"The {name} field is required.");
            return false;
        }

        private bool RequiredText(string? value, string key, string name)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return true;
            }

            errors.AddBody(key, $"The {name} field is required.");
            return false;
        }

        private bool RequiredValue<T>(T? value, string key, string name)
            where T : struct
        {
            if (value.HasValue)
            {
                return true;
            }

            errors.AddBody(key, $"The {name} field is required.");
            return false;
        }

        private void Allowed(string? value, string[] allowed, string key, string name)
        {
            // Like AllowedValuesAttribute, a missing value isn't one of the allowed values either.
            if (value is null || !allowed.Contains(value, StringComparer.Ordinal))
            {
                errors.AddBody(key, $"The {name} field does not equal any of the values specified in AllowedValuesAttribute.");
            }
        }

        private void Pattern(string value, Regex pattern, string key, string message)
        {
            var match = pattern.Match(value);
            if (!match.Success || match.Index != 0 || match.Length != value.Length)
            {
                errors.AddBody(key, message);
            }
        }

        private void MaxLength(string value, int maximum, string name)
        {
            if (value.Length > maximum)
            {
                errors.AddBody(name, $"The field {name} must be a string with a maximum length of {maximum.ToString(CultureInfo.InvariantCulture)}.");
            }
        }

        private void NoControlCharacters(string value, string name)
        {
            if (value.Any(char.IsControl))
            {
                errors.AddBody(name, $"{name} must not contain control characters.");
            }
        }

        private void Range(double value, double minimum, double maximum, string key, string name)
        {
            if (value < minimum || value > maximum)
            {
                errors.AddBody(
                    key,
                    $"The field {name} must be between {minimum.ToString(CultureInfo.InvariantCulture)} and {maximum.ToString(CultureInfo.InvariantCulture)}.");
            }
        }

        private string? String(JsonObject parent, string name, string path)
        {
            var node = parent[name];
            if (node is null)
            {
                return null;
            }

            if (node is JsonValue value && value.TryGetValue(out string? text))
            {
                return text;
            }

            errors.TypeError($"{path}.{name}", "System.String");
            return null;
        }

        private JsonObject? Object(JsonObject parent, string name, string path, string typeName)
        {
            var node = parent[name];
            if (node is null or JsonObject)
            {
                return node as JsonObject;
            }

            errors.TypeError($"{path}.{name}", typeName);
            return null;
        }

        private JsonArray? Array(JsonObject parent, string name, string path)
        {
            var node = parent[name];
            if (node is null or JsonArray)
            {
                return node as JsonArray;
            }

            errors.TypeError($"{path}.{name}", "an array");
            return null;
        }

        private JsonObject? Element(JsonArray array, int index, string path, string typeName)
        {
            var node = array[index];
            if (node is null or JsonObject)
            {
                return node as JsonObject;
            }

            errors.TypeError(path, typeName);
            return null;
        }

        private void StringArray(JsonObject parent, string name, string path)
        {
            var array = Array(parent, name, path);
            for (var i = 0; array is not null && i < array.Count; i++)
            {
                if (array[i] is not null and not JsonValue)
                {
                    errors.TypeError($"{path}.{name}[{i}]", "System.String");
                }
                else if (array[i] is JsonValue value && !value.TryGetValue(out string? _))
                {
                    errors.TypeError($"{path}.{name}[{i}]", "System.String");
                }
            }
        }

        private double? Number(JsonObject parent, string name, string path, bool allowNull)
        {
            // Dragon Copilot also accepts a number written as a string, such as "0.9".
            var present = parent.TryGetPropertyValue(name, out var node);
            if (node is JsonValue value)
            {
                if (value.TryGetValue(out double number))
                {
                    return number;
                }

                if (value.TryGetValue(out string? text)
                    && double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out number)
                    && double.IsFinite(number))
                {
                    return number;
                }
            }

            if (present && (node is not null || !allowNull))
            {
                errors.TypeError($"{path}.{name}", "System.Double");
            }

            return null;
        }

        private int? Integer(JsonObject parent, string name, string path)
        {
            var present = parent.TryGetPropertyValue(name, out var node);
            if (node is JsonValue value)
            {
                if (value.TryGetValue(out int number))
                {
                    return number;
                }

                if (value.TryGetValue(out string? text)
                    && int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
                {
                    return number;
                }
            }

            if (present)
            {
                errors.TypeError($"{path}.{name}", "System.Int32");
            }

            return null;
        }

        private bool? Boolean(JsonObject parent, string name, string path)
        {
            var present = parent.TryGetPropertyValue(name, out var node);
            if (node is JsonValue value && value.TryGetValue(out bool flag))
            {
                return flag;
            }

            if (present)
            {
                errors.TypeError($"{path}.{name}", "System.Boolean");
            }

            return null;
        }
    }

    /// <summary>
    /// Collects errors keyed the way Dragon Copilot keys them: route parameters by name, body rules
    /// by property path, and a body that can't be read by its JSON path.
    /// </summary>
    private sealed class ErrorCollector
    {
        private readonly Dictionary<string, List<string>> _routeErrors = new(StringComparer.Ordinal);
        private readonly Dictionary<string, List<string>> _bodyErrors = new(StringComparer.Ordinal);
        private (string Path, string Message)? _typeError;

        public bool HasBodyErrors => _bodyErrors.Count > 0 || _typeError is not null;

        public void AddRoute(string key, string message) => Add(_routeErrors, key, message);

        public void AddBody(string key, string message) => Add(_bodyErrors, key, message);

        public void TypeError(string path, string typeName) =>
            // Reading stops at the first value of the wrong type, so only that one is reported.
            _typeError ??= (path, $"The JSON value could not be converted to {typeName}. Path: {path}.");

        public SubmissionValidation ToValidation(JsonObject? body)
        {
            var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);
            foreach (var (key, messages) in _routeErrors)
            {
                errors[key] = [.. messages];
            }

            if (_typeError is { } typeError)
            {
                // A body that can't be read is reported instead of its rules, as Dragon Copilot does.
                errors[typeError.Path] = [typeError.Message];
                errors[BodyKey] = [BodyRequired];
            }
            else
            {
                foreach (var (key, messages) in _bodyErrors)
                {
                    errors[key] = [.. messages];
                }
            }

            return new SubmissionValidation(errors, errors.Count == 0 ? body : null);
        }

        private static void Add(Dictionary<string, List<string>> errors, string key, string message)
        {
            if (!errors.TryGetValue(key, out var messages))
            {
                messages = [];
                errors[key] = messages;
            }

            messages.Add(message);
        }
    }
}

/// <summary>
/// The result of validating a submission.
/// </summary>
/// <param name="Errors">The errors, keyed by route parameter or property path. Empty when the submission is valid.</param>
/// <param name="Body">The parsed body when the submission is valid, otherwise null.</param>
public sealed record SubmissionValidation(IReadOnlyDictionary<string, string[]> Errors, JsonObject? Body)
{
    /// <summary>
    /// Gets a value indicating whether the submission is valid.
    /// </summary>
    public bool IsValid => Errors.Count == 0;
}
