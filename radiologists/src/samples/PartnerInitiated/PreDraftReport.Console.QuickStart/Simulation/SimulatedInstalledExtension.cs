using YamlDotNet.Core;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace PreDraftReport.Console.QuickStart.Simulation;

/// <summary>
/// An extension installed in the simulated environment, read from its manifest.
/// </summary>
/// <remarks>
/// As in Dragon Copilot, a manifest that can't be read doesn't count as installed, so a submission
/// for it gets 404 with reason ExtensionNotFound.
/// </remarks>
public sealed class SimulatedInstalledExtension
{
    private const string PartnerInitiated = "partnerInitiated";
    private const string PreDraftReportGeneration = "preDraftReportGeneration";

    private static readonly IDeserializer ManifestDeserializer = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    private SimulatedInstalledExtension()
    {
    }

    /// <summary>
    /// Gets the full path of the manifest.
    /// </summary>
    public string ManifestPath { get; private init; } = string.Empty;

    /// <summary>
    /// Gets the manifest's top-level <c>name</c>, or null when the manifest couldn't be read.
    /// </summary>
    public string? ManifestName { get; private init; }

    /// <summary>
    /// Gets the tools the manifest declares.
    /// </summary>
    public IReadOnlyList<ManifestTool> Tools { get; private init; } = [];

    /// <summary>
    /// Gets the Microsoft Marketplace publisher ID the extension was purchased with, or null for a custom app.
    /// </summary>
    public string? PublisherId { get; private init; }

    /// <summary>
    /// Gets the Microsoft Marketplace offer ID the extension was purchased with, or null for a custom app.
    /// </summary>
    public string? OfferId { get; private init; }

    /// <summary>
    /// Gets the Microsoft Marketplace plan ID the extension was purchased with, or null for a custom app.
    /// </summary>
    public string? PlanId { get; private init; }

    /// <summary>
    /// Gets why the manifest couldn't be read, or null when it was read.
    /// </summary>
    public string? Problem { get; private init; }

    /// <summary>
    /// Reads an installation's manifest.
    /// </summary>
    /// <param name="installation">The installation to read.</param>
    /// <param name="baseDirectory">The folder a relative manifest path is relative to.</param>
    /// <returns>The installed extension.</returns>
    public static SimulatedInstalledExtension Load(SimulatedInstallation installation, string baseDirectory)
    {
        ArgumentNullException.ThrowIfNull(installation);

        var publisherId = Normalize(installation.PublisherId);
        var offerId = Normalize(installation.OfferId);
        var planId = Normalize(installation.PlanId);

        if (string.IsNullOrWhiteSpace(installation.ManifestPath))
        {
            return new SimulatedInstalledExtension { Problem = "has no ManifestPath." };
        }

        var path = Path.GetFullPath(installation.ManifestPath, baseDirectory);
        if (!File.Exists(path))
        {
            return new SimulatedInstalledExtension { ManifestPath = path, Problem = "was not found." };
        }

        ManifestDocument? manifest;
        try
        {
            manifest = ManifestDeserializer.Deserialize<ManifestDocument?>(File.ReadAllText(path));
        }
        catch (YamlException ex)
        {
            return new SimulatedInstalledExtension { ManifestPath = path, Problem = $"could not be read: {ex.Message}" };
        }

        if (string.IsNullOrWhiteSpace(manifest?.Name))
        {
            return new SimulatedInstalledExtension { ManifestPath = path, Problem = "has no name." };
        }

        return new SimulatedInstalledExtension
        {
            ManifestPath = path,
            ManifestName = manifest.Name,
            Tools = (manifest.Tools ?? [])
                .Where(tool => !string.IsNullOrWhiteSpace(tool.Name))
                .Select(tool => new ManifestTool(tool.Name!, tool.ToolType, tool.Capability))
                .ToList(),
            PublisherId = publisherId,
            OfferId = offerId,
            PlanId = planId,
        };
    }

    /// <summary>
    /// Checks whether the manifest declares a <c>partnerInitiated</c> tool with this name and the
    /// <c>preDraftReportGeneration</c> capability. Names are compared ignoring case.
    /// </summary>
    /// <param name="toolName">The tool name from the submission.</param>
    /// <returns>True when the manifest declares the tool.</returns>
    public bool DeclaresPreDraftReportTool(string toolName) =>
        Tools.Any(tool =>
            string.Equals(tool.Name, toolName, StringComparison.OrdinalIgnoreCase)
            && string.Equals(tool.ToolType, PartnerInitiated, StringComparison.OrdinalIgnoreCase)
            && string.Equals(tool.Capability, PreDraftReportGeneration, StringComparison.OrdinalIgnoreCase));

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed class ManifestDocument
    {
        public string? Name { get; set; }

        public List<ManifestToolDocument>? Tools { get; set; }
    }

    private sealed class ManifestToolDocument
    {
        public string? Name { get; set; }

        public string? ToolType { get; set; }

        public string? Capability { get; set; }
    }
}

/// <summary>
/// A tool declared in an installed extension's manifest.
/// </summary>
/// <param name="Name">The tool's <c>name</c>.</param>
/// <param name="ToolType">The tool's <c>toolType</c>.</param>
/// <param name="Capability">The tool's <c>capability</c>.</param>
public sealed record ManifestTool(string Name, string? ToolType, string? Capability);
