// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Nodes;
using SampleConversational.Mcp.Web.Services;
using SampleConversational.Mcp.Web.Tools;

namespace SampleConversational.Mcp.Web.Tests;

public class ClinicalReferenceTests
{
    [Theory]
    [InlineData("HbA1c", "4.0-5.6")]
    [InlineData(" potassium ", "3.5-5.0")]
    public void LookupReferenceRange_KnownTest_ReturnsRange(string test, string expected)
    {
        Assert.Equal(expected, ClinicalReference.LookupReferenceRange(test)?.Range);
    }

    [Fact]
    public void LookupReferenceRange_UnknownTest_ReturnsNull()
    {
        Assert.Null(ClinicalReference.LookupReferenceRange("unobtainium"));
    }

    [Fact]
    public void ExtractOrders_FindsEachCategory()
    {
        var result = ClinicalReference.ExtractOrders(
            "Order a CBC. Get a chest x-ray. Start metformin 500 mg. Refer to cardiology.",
            "conv-1");

        var categories = result.Orders.Select(o => o.Category).Distinct().ToList();
        Assert.Contains("Lab", categories);
        Assert.Contains("Imaging", categories);
        Assert.Contains("Medication", categories);
        Assert.Contains("Referral", categories);
        Assert.Equal("conv-1", result.ConversationId);
        Assert.False(string.IsNullOrWhiteSpace(result.Summary));
    }

    [Fact]
    public void ExtractOrders_NoOrders_ReturnsEmpty()
    {
        var result = ClinicalReference.ExtractOrders("Patient feels well today.");
        Assert.Empty(result.Orders);
    }

    [Fact]
    public void ReadConversationId_ReadsSideChannelValue()
    {
        var meta = JsonNode.Parse("""{ "dragon": { "conversationId": "abc" } }""")!.AsObject();
        Assert.Equal("abc", ClinicalTools.ReadConversationId(meta));
    }

    [Fact]
    public void ReadConversationId_MissingOrWrongType_ReturnsNull()
    {
        Assert.Null(ClinicalTools.ReadConversationId(null));
        Assert.Null(ClinicalTools.ReadConversationId(JsonNode.Parse("""{ "dragon": { "conversationId": 5 } }""")!.AsObject()));
    }
}
