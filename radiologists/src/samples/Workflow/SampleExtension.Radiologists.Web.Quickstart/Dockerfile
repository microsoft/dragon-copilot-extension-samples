# Radiologists Quickstart sample (cross-platform, mock data — no model or credentials needed).
# The build context is the repository root, e.g.:
#   docker build -f radiologists/src/samples/Workflow/SampleExtension.Radiologists.Web.Quickstart/Dockerfile -t radiologists-quickstart .
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the whole repository so Central Package Management (Directory.Packages.props)
# and Directory.Build.props resolve during restore.
COPY . .

RUN dotnet publish "radiologists/src/samples/Workflow/SampleExtension.Radiologists.Web.Quickstart/SampleExtension.Radiologists.Web.Quickstart.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SampleExtension.Radiologists.Web.Quickstart.dll"]
