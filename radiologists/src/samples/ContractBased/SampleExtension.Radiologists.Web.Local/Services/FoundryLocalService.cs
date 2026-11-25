using System.ClientModel;
using System.Diagnostics.CodeAnalysis;
using Microsoft.AI.Foundry.Local;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using SampleExtension.Radiologists.Web.Local.Configuration;
using FoundryConfiguration = Microsoft.AI.Foundry.Local.Configuration;

namespace SampleExtension.Radiologists.Web.Local.Services;

/// <summary>
/// On-device chat completion provider backed by Microsoft.AI.Foundry.Local.
///
/// Lifecycle:
///   * Singleton in DI.
///   * Lazy initialization on first <see cref="GetChatClientAsync"/> call (model download,
///     load, and local web service start can take seconds to minutes).
///   * Subsequent calls reuse the same loaded model and HTTP client.
///   * <see cref="DisposeAsync"/> stops the web service and unloads the model.
/// </summary>
public sealed class FoundryLocalService : IFoundryLocalService, IAsyncDisposable
{
    private readonly FoundryLocalSettings _settings;
    private readonly ILogger<FoundryLocalService> _logger;
    private readonly ILoggerFactory _loggerFactory;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    private FoundryLocalManager? _manager;
    private IModel? _model;
    private ChatClient? _chatClient;
    private bool _disposed;

    public FoundryLocalService(
        IOptions<FoundryLocalSettings> settings,
        ILogger<FoundryLocalService> logger,
        ILoggerFactory loggerFactory)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentNullException.ThrowIfNull(loggerFactory);

        _settings = settings.Value;
        _logger = logger;
        _loggerFactory = loggerFactory;
    }

    /// <inheritdoc />
    [SuppressMessage("Maintainability", "CA1508:Avoid dead conditional code", Justification = "Double-check locking; second null check is reachable from concurrent callers.")]
    public async Task<ChatClient> GetChatClientAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (_chatClient is not null)
        {
            return _chatClient;
        }

        await _initLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_chatClient is not null)
            {
                return _chatClient;
            }

            _chatClient = await InitializeAsync(cancellationToken).ConfigureAwait(false);
            return _chatClient;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing Foundry Local.");
            throw;
        }
        finally
        {
            _initLock.Release();
        }
    }

    private async Task<ChatClient> InitializeAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Initializing Foundry Local. Model={ModelAlias}, Device={DeviceType}, AppName={AppName}",
            _settings.ModelAlias,
            _settings.DeviceType,
            _settings.AppName);

        var appDataDir = string.IsNullOrWhiteSpace(_settings.AppDataDir)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".foundry")
            : _settings.AppDataDir;

        var configuration = new FoundryConfiguration
        {
            AppName = _settings.AppName,
            AppDataDir = appDataDir,
            // Bind to a random localhost port so multiple instances don't collide.
            Web = new FoundryConfiguration.WebService { Urls = "http://127.0.0.1:0" }
        };

        await FoundryLocalManager.CreateAsync(
            configuration,
            _loggerFactory.CreateLogger<FoundryLocalManager>())
            .ConfigureAwait(false);

        _manager = FoundryLocalManager.Instance;

        var deviceType = ParseDeviceType(_settings.DeviceType);

        var catalog = await _manager.GetCatalogAsync().ConfigureAwait(false);
        var modelFamily = await catalog.GetModelAsync(_settings.ModelAlias).ConfigureAwait(false)
            ?? throw new InvalidOperationException(
                $"Foundry Local model '{_settings.ModelAlias}' not found in catalog.");

        _model = modelFamily.Variants.FirstOrDefault(v => v.Info.Runtime?.DeviceType == deviceType)
            ?? throw new InvalidOperationException(
                $"No '{deviceType}' variant available for model '{_settings.ModelAlias}'.");

        if (!await _model.IsCachedAsync().ConfigureAwait(false))
        {
            _logger.LogInformation(
                "Foundry Local model '{ModelId}' is not cached locally. Downloading is a one-time operation that can take several minutes depending on model size and network speed. Subsequent runs will reuse the cached copy. Downloading now...",
                _model.Id);

            await _model.DownloadAsync().ConfigureAwait(false);

            _logger.LogInformation("Foundry Local model '{ModelId}' download complete.", _model.Id);
        }
        else
        {
            _logger.LogInformation("Foundry Local model '{ModelId}' already cached locally; skipping download.", _model.Id);
        }

        _logger.LogInformation("Loading model '{ModelId}' into memory (this may take a few seconds)...", _model.Id);
        await _model.LoadAsync().ConfigureAwait(false);

        await _manager.StartWebServiceAsync().ConfigureAwait(false);

        var serviceUrl = _manager.Urls?.FirstOrDefault()
            ?? throw new InvalidOperationException("Foundry Local web service started but reported no URL.");

        _logger.LogInformation(
            "Foundry Local is ready. Model '{ModelId}' loaded; local OpenAI-compatible endpoint listening on {Url}.",
            _model.Id,
            serviceUrl);

        var openAiClient = new OpenAIClient(
            new ApiKeyCredential("NO_API_KEY"),
            new OpenAIClientOptions { Endpoint = new Uri($"{serviceUrl}/v1") });

        return openAiClient.GetChatClient(_model.Id);
    }

    private static DeviceType ParseDeviceType(string value)
    {
        if (Enum.TryParse<DeviceType>(value, ignoreCase: true, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException(
            $"Invalid Foundry Local DeviceType '{value}'. Expected one of: CPU, GPU, NPU.");
    }

    [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "Disposal must never throw.")]
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;

        try
        {
            if (_manager is not null)
            {
                await _manager.StopWebServiceAsync().ConfigureAwait(false);
            }

            if (_model is not null)
            {
                await _model.UnloadAsync().ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while shutting down Foundry Local.");
        }
        finally
        {
            _manager?.Dispose();
            _initLock.Dispose();
        }
    }
}
