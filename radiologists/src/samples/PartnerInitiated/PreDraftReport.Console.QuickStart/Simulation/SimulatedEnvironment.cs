namespace PreDraftReport.Console.QuickStart.Simulation;

/// <summary>
/// A customer environment as the simulated endpoint sees it: the extensions installed in it, the
/// orders it holds and the results already stored.
/// </summary>
public sealed class SimulatedEnvironment
{
    private readonly HashSet<string> _storedResults;

    private SimulatedEnvironment(
        SimulationSettings settings,
        IReadOnlyList<SimulatedInstalledExtension> installations,
        string storedResultsPath,
        HashSet<string> storedResults)
    {
        CustomerTenantId = settings.CustomerTenantId;
        EnvironmentId = settings.EnvironmentId;
        Installations = installations;
        Orders = [.. settings.Orders];
        StoredResultsPath = storedResultsPath;
        _storedResults = storedResults;
    }

    /// <summary>
    /// Gets the file used to remember stored results when no other is configured.
    /// </summary>
    public static string DefaultStoredResultsPath { get; } =
        Path.Combine(Path.GetTempPath(), "PreDraftReport.Console.QuickStart", "stored-results.txt");

    /// <summary>
    /// Gets the customer tenant the environment belongs to.
    /// </summary>
    public string CustomerTenantId { get; }

    /// <summary>
    /// Gets the environment's ID.
    /// </summary>
    public string EnvironmentId { get; }

    /// <summary>
    /// Gets the extensions installed in the environment.
    /// </summary>
    public IReadOnlyList<SimulatedInstalledExtension> Installations { get; }

    /// <summary>
    /// Gets the accession numbers of the environment's orders.
    /// </summary>
    public IReadOnlyList<string> Orders { get; }

    /// <summary>
    /// Gets the file that remembers stored results between runs.
    /// </summary>
    public string StoredResultsPath { get; }

    /// <summary>
    /// Builds the environment from settings, reading each installed manifest and the results stored
    /// by earlier runs.
    /// </summary>
    /// <param name="settings">The simulation settings.</param>
    /// <param name="baseDirectory">The folder that relative paths in the settings are relative to.</param>
    /// <returns>The environment.</returns>
    public static SimulatedEnvironment Load(SimulationSettings settings, string baseDirectory)
    {
        ArgumentNullException.ThrowIfNull(settings);

        var installations = settings.Installations
            .Select(installation => SimulatedInstalledExtension.Load(installation, baseDirectory))
            .ToList();

        var storedResultsPath = string.IsNullOrWhiteSpace(settings.StoredResultsPath)
            ? DefaultStoredResultsPath
            : Path.GetFullPath(settings.StoredResultsPath, baseDirectory);

        var storedResults = File.Exists(storedResultsPath)
            ? File.ReadAllLines(storedResultsPath).Where(line => line.Length > 0).ToHashSet(StringComparer.Ordinal)
            : new HashSet<string>(StringComparer.Ordinal);

        return new SimulatedEnvironment(settings, installations, storedResultsPath, storedResults);
    }

    /// <summary>
    /// Checks whether the route's customer tenant and environment identify this environment.
    /// </summary>
    /// <param name="customerTenantId">The customer tenant ID from the route.</param>
    /// <param name="environmentId">The environment ID from the route.</param>
    /// <returns>True when they identify this environment.</returns>
    public bool Matches(string customerTenantId, string environmentId) =>
        string.Equals(CustomerTenantId, customerTenantId, StringComparison.OrdinalIgnoreCase)
        && string.Equals(EnvironmentId, environmentId, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Finds the installed extensions a submission matches.
    /// </summary>
    /// <param name="manifestName">The submission's <c>manifestName</c>, compared ignoring case.</param>
    /// <param name="publisherId">The submission's Microsoft Marketplace publisher ID, or null.</param>
    /// <param name="offerId">The submission's Microsoft Marketplace offer ID, or null.</param>
    /// <param name="planId">The submission's Microsoft Marketplace plan ID, or null.</param>
    /// <returns>The matching installations.</returns>
    public IReadOnlyList<SimulatedInstalledExtension> FindExtensions(string manifestName, string? publisherId, string? offerId, string? planId) =>
        Installations
            // With Marketplace IDs, only an extension purchased with that offer and plan matches,
            // so an extension uploaded as a custom app never does.
            .Where(installation => publisherId is null
                || (string.Equals(installation.PublisherId, publisherId, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(installation.OfferId, offerId, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(installation.PlanId, planId, StringComparison.OrdinalIgnoreCase)))
            .Where(installation => string.Equals(installation.ManifestName, manifestName, StringComparison.OrdinalIgnoreCase))
            .ToList();

    /// <summary>
    /// Counts the orders with an accession number.
    /// </summary>
    /// <param name="accessionNumber">The accession number.</param>
    /// <returns>The number of orders.</returns>
    public int CountOrders(string accessionNumber) =>
        Orders.Count(order => string.Equals(order, accessionNumber, StringComparison.Ordinal));

    /// <summary>
    /// Checks whether a result with this identifier is already stored in the environment.
    /// </summary>
    /// <param name="environmentId">The environment ID.</param>
    /// <param name="identifier">The submission's <c>draftReport.identifier</c>.</param>
    /// <returns>True when a result with the identifier is stored.</returns>
    public bool HasStoredResult(string environmentId, string identifier)
    {
        ArgumentNullException.ThrowIfNull(environmentId);
        ArgumentNullException.ThrowIfNull(identifier);
        return _storedResults.Contains(StoredResultKey(environmentId, identifier));
    }

    /// <summary>
    /// Stores a result, remembering its identifier for later runs.
    /// </summary>
    /// <param name="environmentId">The environment ID.</param>
    /// <param name="identifier">The submission's <c>draftReport.identifier</c>.</param>
    /// <param name="cancellationToken">Cancels the write.</param>
    /// <returns>A task that completes when the result is stored.</returns>
    public async Task StoreResultAsync(string environmentId, string identifier, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(environmentId);
        ArgumentNullException.ThrowIfNull(identifier);

        var key = StoredResultKey(environmentId, identifier);
        if (!_storedResults.Add(key))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(StoredResultsPath)!);
        await File.AppendAllTextAsync(StoredResultsPath, key + Environment.NewLine, cancellationToken).ConfigureAwait(false);
    }

    private static string StoredResultKey(string environmentId, string identifier) =>
        $"{environmentId.ToUpperInvariant()}\t{identifier}";
}
