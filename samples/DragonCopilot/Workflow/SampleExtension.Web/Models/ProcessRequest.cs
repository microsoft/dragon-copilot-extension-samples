namespace SampleExtension.Web.Models;

/// <summary>
/// Request model for processing data from the Dragon Backend Simulator
/// </summary>
public class ProcessRequest
{
    /// <summary>
    /// The unique identifier for the request
    /// </summary>
    public Guid RequestId { get; set; }
    
    /// <summary>
    /// The encounter ID from the backend simulator
    /// </summary>
    public Guid? EncounterId { get; set; }
    
    /// <summary>
    /// The data to be processed
    /// </summary>
    public string Data { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional metadata for the processing request
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
    
    /// <summary>
    /// The timestamp when the request was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
