// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;

namespace SampleExtension.Web.Models;

/// <summary>
/// Request model for processing data from Dragon Copilot
/// </summary>
public class ProcessRequest
{
    /// <summary>
    /// The unique identifier for the request
    /// </summary>
    public Guid RequestId { get; set; }

    /// <summary>
    /// The encounter ID from Dragon Copilot
    /// </summary>
    public Guid? EncounterId { get; set; }

    /// <summary>
    /// The data to be processed
    /// </summary>
    public string Data { get; set; } = string.Empty;

    /// <summary>
    /// Optional metadata for the processing request
    /// </summary>
    public IReadOnlyDictionary<string, object>? Metadata { get; set; } = new Dictionary<string, object>();

    /// <summary>
    /// The timestamp when the request was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
