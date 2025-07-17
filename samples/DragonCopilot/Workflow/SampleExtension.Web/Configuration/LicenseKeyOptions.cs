// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;

namespace SampleExtension.Web.Configuration;

/// <summary>
/// License key validation configuration options
/// </summary>
public class LicenseKeyOptions
{
    /// <summary>
    /// The configuration section name
    /// </summary>
    public const string SectionName = "LicenseKey";

    /// <summary>
    /// Whether license key validation is enabled
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Header name containing the license key
    /// </summary>
    public string HeaderName { get; set; }

    /// <summary>
    /// Array of valid license keys
    /// </summary>
    public ICollection<string> ValidKeys { get; } = new HashSet<string>();
}
