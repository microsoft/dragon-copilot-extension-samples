namespace DragonBackendSimulator.Web.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication ConfigureRequestPipeline(this WebApplication app)
    {
        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            // Add Swagger UI at root
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Dragon Backend Simulator API v1");
                c.RoutePrefix = string.Empty; // Set Swagger UI at the app's root
            });
            
            // Keep the OpenAPI endpoint as well for compatibility
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();

        // Map controllers
        app.MapControllers();

        return app;
    }
}
