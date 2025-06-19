// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;

namespace DragonBackendSimulator.Web.Configuration;

public sealed class ExtensionApiOptions
{
  public const string SectionName = "ExtensionApi";

  public required Uri BaseUrl { get; set; }

  public string Path { get; set; } = string.Empty;

  public int TimeoutSeconds { get; set; } = 30;
}
