// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;

namespace SampleExtension.Web.Models;

/// <summary>
/// Response model for processed data
/// </summary>
public class ProcessResponse
{
    /// <summary>
    /// The unique identifier for the response
    /// </summary>
    public Guid ResponseId { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The original request ID
    /// </summary>
    public Guid RequestId { get; set; }

    /// <summary>
    /// Indicates if the processing was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The processed result data
    /// </summary>
    public string? Result { get; set; }

    /// <summary>
    /// Any error message if processing failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Processing duration in milliseconds
    /// </summary>
    public long ProcessingTimeMs { get; set; }

    /// <summary>
    /// Additional metadata about the processing
    /// </summary>
    public IReadOnlyDictionary<string, object>? Metadata { get; set; } = new Dictionary<string, object>();

    /// <summary>
    /// The timestamp when the response was created
    /// </summary>
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}
