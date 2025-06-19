# Use the official .NET runtime as a parent image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

# Use the SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["SampleExtension.Web.csproj", "."]
RUN dotnet restore "SampleExtension.Web.csproj"

# Copy the entire project and build it
COPY . .
WORKDIR "/src"
RUN dotnet build "SampleExtension.Web.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "SampleExtension.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Copy the published application to the base image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set the entry point for the application
ENTRYPOINT ["dotnet", "SampleExtension.Web.dll"]
