FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy project files for restore (in dependency order)
COPY ["src/Dragon.Copilot.Models/Dragon.Copilot.Models.csproj", "src/Dragon.Copilot.Models/"]
COPY ["DragonBackendSimulator/DragonBackendSimulator.Web/DragonBackendSimulator.Web.csproj", "DragonBackendSimulator/DragonBackendSimulator.Web/"]

# Restore dependencies
RUN dotnet restore "DragonBackendSimulator/DragonBackendSimulator.Web/DragonBackendSimulator.Web.csproj"

# Copy the entire source code
COPY . .

# Build the application
WORKDIR "/src/DragonBackendSimulator/DragonBackendSimulator.Web"
RUN dotnet build "DragonBackendSimulator.Web.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
WORKDIR "/src/DragonBackendSimulator/DragonBackendSimulator.Web"
RUN dotnet publish "DragonBackendSimulator.Web.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DragonBackendSimulator.Web.dll"]
