# Build from the repository root:
#   docker build -f physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/Dockerfile -t sample-conversational-openapi .
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "Directory.Packages.props", "./"]
COPY ["physician/src/samples/DragonCopilot/Conversational/Directory.Packages.props", "physician/src/samples/DragonCopilot/Conversational/"]
COPY ["physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.csproj", "physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/"]
RUN dotnet restore "physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.csproj"
COPY physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/ physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/

FROM build AS publish
WORKDIR /src/physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web
RUN dotnet publish "SampleConversational.OpenApi.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SampleConversational.OpenApi.Web.dll"]
