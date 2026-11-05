using Microsoft.Extensions.Configuration;
using PreDraftReport.Console.QuickStart.Simulation;

namespace PreDraftReport.Console.QuickStart;

/// <summary>
/// Settings read from appsettings.json, user secrets and environment variables.
/// </summary>
public sealed class SampleSettings
{
    /// <summary>
    /// Gets or sets the customer environment the draft report is submitted to.
    /// </summary>
    public DragonCopilotSettings DragonCopilot { get; set; } = new();

    /// <summary>
    /// Gets or sets how the console authenticates.
    /// </summary>
    public AuthenticationSettings Authentication { get; set; } = new();

    /// <summary>
    /// Gets or sets the customer environment the simulated endpoint pretends to be.
    /// </summary>
    public SimulationSettings Simulation { get; set; } = new();

    /// <summary>
    /// Binds the settings from configuration.
    /// </summary>
    /// <param name="configuration">The configuration to bind from.</param>
    /// <returns>The bound settings.</returns>
    public static SampleSettings Load(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var settings = new SampleSettings();
        configuration.Bind(settings);
        return settings;
    }
}

/// <summary>
/// The customer environment a draft report is submitted to.
/// </summary>
public sealed class DragonCopilotSettings
{
    /// <summary>
    /// Gets or sets the customer's Microsoft Entra tenant ID.
    /// </summary>
    public string CustomerTenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the ID of the customer environment the extension is installed in.
    /// </summary>
    public string EnvironmentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets how long to wait for a response before giving up.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// How the console authenticates. Off by default, so the sample runs without an app registration.
/// </summary>
public sealed class AuthenticationSettings
{
    /// <summary>
    /// Gets or sets a value indicating whether to acquire an access token and send it with the submission.
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Gets or sets the Partner tenant ID, the tenant in the manifest's <c>auth.tenantId</c>.
    /// </summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Partner app registration's application (client) ID.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Partner app registration's client secret. Keep it in user secrets or an
    /// environment variable, never in appsettings.json.
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;
}
