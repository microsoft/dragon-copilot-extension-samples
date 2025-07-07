# Use the official .NET runtime as a parent image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

# Use the SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files for restore (in dependency order)
COPY ["src/Dragon.Copilot.Models/Dragon.Copilot.Models.csproj", "src/Dragon.Copilot.Models/"]
COPY ["samples/DragonCopilot/Workflow/SampleExtension.Web/SampleExtension.Web.csproj", "samples/DragonCopilot/Workflow/SampleExtension.Web/"]

# Restore dependencies
RUN dotnet restore "samples/DragonCopilot/Workflow/SampleExtension.Web/SampleExtension.Web.csproj"

# Copy the entire source code
COPY . .

# Build the application
WORKDIR "/src/samples/DragonCopilot/Workflow/SampleExtension.Web"
RUN dotnet build "SampleExtension.Web.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
WORKDIR "/src/samples/DragonCopilot/Workflow/SampleExtension.Web"
RUN dotnet publish "SampleExtension.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Copy the published application to the base image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set the entry point for the application
ENTRYPOINT ["dotnet", "SampleExtension.Web.dll"]
