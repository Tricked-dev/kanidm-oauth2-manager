{
  description = "Kanidm OAuth2 Manager — web UI for managing Kanidm OAuth2 apps, groups, and users";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
  };

  outputs =
    { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.callPackage ./nix/package.nix { };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.bashInteractive
            pkgs.bun
            pkgs.nodejs
          ];
        };
      }
    )
    // {
      nixosModules.default = import ./nix/module.nix;
    };
}
