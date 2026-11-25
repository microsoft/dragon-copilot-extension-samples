using System.Collections.ObjectModel;

namespace PreDraftReport.Console.QuickStart.Simulation;

/// <summary>
/// The customer environment the simulated endpoint pretends to be.
/// </summary>
public sealed class SimulationSettings
{
    /// <summary>
    /// Gets or sets the customer tenant the simulated environment belongs to.
    /// </summary>
    public string CustomerTenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the simulated environment's ID.
    /// </summary>
    public string EnvironmentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets the extensions installed in the simulated environment.
    /// </summary>
    public Collection<SimulatedInstallation> Installations { get; } = [];

    /// <summary>
    /// Gets the accession numbers of the orders in the simulated environment. List a number twice
    /// to give it two orders.
    /// </summary>
    public Collection<string> Orders { get; } = [];

    /// <summary>
    /// Gets or sets the file that remembers stored results between runs. When not set, a file in
    /// the temp folder is used.
    /// </summary>
    public string? StoredResultsPath { get; set; }
}

/// <summary>
/// An extension installed in the simulated environment.
/// </summary>
public sealed class SimulatedInstallation
{
    /// <summary>
    /// Gets or sets the path to the extension's manifest. A relative path is relative to the app's
    /// output folder.
    /// </summary>
    public string ManifestPath { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Microsoft Marketplace publisher ID the extension was purchased with. Leave
    /// all three IDs empty for an extension uploaded as a custom app.
    /// </summary>
    public string? PublisherId { get; set; }

    /// <summary>
    /// Gets or sets the Microsoft Marketplace offer ID the extension was purchased with.
    /// </summary>
    public string? OfferId { get; set; }

    /// <summary>
    /// Gets or sets the Microsoft Marketplace plan ID the extension was purchased with.
    /// </summary>
    public string? PlanId { get; set; }
}
