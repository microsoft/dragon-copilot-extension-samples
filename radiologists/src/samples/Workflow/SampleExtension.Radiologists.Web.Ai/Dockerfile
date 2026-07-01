# Radiologists AI sample (cross-platform, Azure OpenAI).
# The build context is the repository root, e.g.:
#   docker build -f radiologists/src/samples/Workflow/SampleExtension.Radiologists.Web.Ai/Dockerfile -t radiologists-ai .
#
# The image builds without any credentials. To call a real model at runtime, supply the
# Azure OpenAI settings as environment variables, e.g.:
#   docker run -p 8080:8080 \
#     -e OpenAI__Endpoint=https://<resource>.openai.azure.com/ \
#     -e OpenAI__ApiKey=<key> \
#     -e OpenAI__DeploymentName=<deployment> \
#     radiologists-ai
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the whole repository so Central Package Management (Directory.Packages.props)
# and Directory.Build.props resolve during restore.
COPY . .

RUN dotnet publish "radiologists/src/samples/Workflow/SampleExtension.Radiologists.Web.Ai/SampleExtension.Radiologists.Web.Ai.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SampleExtension.Radiologists.Web.Ai.dll"]
