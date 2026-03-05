// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Json converter to ensure Camel case serialization of enum values, and disallow integer values.
/// </summary>
public sealed class CamelCaseEnumConverter : JsonStringEnumConverter
{
    /// <summary>
    /// Converter to serialize/deserialize enums as camelCase strings, and disallow integer values.
    /// </summary>
    public CamelCaseEnumConverter()
        : base(JsonNamingPolicy.CamelCase, allowIntegerValues: false) { }
}