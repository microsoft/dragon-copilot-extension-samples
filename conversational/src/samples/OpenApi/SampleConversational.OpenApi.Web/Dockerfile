# Build from the repository root:
#   docker build -f conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/Dockerfile -t sample-conversational-openapi .
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "Directory.Packages.props", "./"]
COPY ["conversational/Directory.Packages.props", "conversational/"]
COPY ["conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.csproj", "conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/"]
RUN dotnet restore "conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.csproj"
COPY conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/ conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/

FROM build AS publish
WORKDIR /src/conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web
RUN dotnet publish "SampleConversational.OpenApi.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SampleConversational.OpenApi.Web.dll"]
