# Build from the repository root:
#   docker build -f conversational/src/samples/Mcp/SampleConversational.Mcp.Web/Dockerfile -t sample-conversational-mcp .
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "Directory.Packages.props", "./"]
COPY ["conversational/Directory.Packages.props", "conversational/"]
COPY ["conversational/src/samples/Mcp/SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.csproj", "conversational/src/samples/Mcp/SampleConversational.Mcp.Web/"]
RUN dotnet restore "conversational/src/samples/Mcp/SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.csproj"
COPY conversational/src/samples/Mcp/SampleConversational.Mcp.Web/ conversational/src/samples/Mcp/SampleConversational.Mcp.Web/

FROM build AS publish
WORKDIR /src/conversational/src/samples/Mcp/SampleConversational.Mcp.Web
RUN dotnet publish "SampleConversational.Mcp.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SampleConversational.Mcp.Web.dll"]
