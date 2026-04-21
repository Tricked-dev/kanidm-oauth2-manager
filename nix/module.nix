{ config, lib, pkgs, ... }:
let
  cfg = config.services.kanidm-oauth2-manager;
in
{
  options.services.kanidm-oauth2-manager = {
    enable = lib.mkEnableOption "Kanidm OAuth2 Manager web UI";

    package = lib.mkPackageOption pkgs "kanidm-oauth2-manager" { };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port to listen on.";
    };

    host = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "Host/address to bind to.";
    };

    origin = lib.mkOption {
      type = lib.types.str;
      description = "Public origin URL (e.g. https://kanidm-manager.example.com). Required by SvelteKit.";
      example = "https://kanidm-manager.example.com";
    };

    kanidmBaseUrl = lib.mkOption {
      type = lib.types.str;
      description = "Base URL of the Kanidm instance.";
      example = "https://idm.example.com";
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to a file containing additional environment variables (e.g. secrets).
        Useful for KANIDM_PASSWORD, etc.
      '';
      example = "/run/secrets/kanidm-oauth2-manager.env";
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "kanidm-manager";
      description = "User to run the service as.";
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "kanidm-manager";
      description = "Group to run the service as.";
    };
  };

  config = lib.mkIf cfg.enable {
    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      description = "Kanidm OAuth2 Manager service user";
    };
    users.groups.${cfg.group} = { };

    systemd.services.kanidm-oauth2-manager = {
      description = "Kanidm OAuth2 Manager";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      environment = {
        PORT = toString cfg.port;
        HOST = cfg.host;
        ORIGIN = cfg.origin;
        KANIDM_BASE_URL = cfg.kanidmBaseUrl;
        NODE_ENV = "production";
      };

      serviceConfig = {
        ExecStart = lib.getExe cfg.package;
        User = cfg.user;
        Group = cfg.group;
        Restart = "on-failure";
        RestartSec = "5s";
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;

        # Hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateDevices = true;
        CapabilityBoundingSet = "";
        AmbientCapabilities = "";
        LockPersonality = true;
        RestrictNamespaces = true;
        RestrictRealtime = true;
        SystemCallFilter = "@system-service";
      };
    };
  };
}
