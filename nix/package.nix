{ pkgs, lib, ... }:
let
  src = lib.cleanSource ../.;

  # Fixed-output derivation: fetches npm/bun deps (network allowed here)
  nodeDeps = pkgs.stdenv.mkDerivation {
    name = "kanidm-oauth2-manager-deps";
    inherit src;
    nativeBuildInputs = [ pkgs.bun ];
    buildPhase = ''
      export HOME=$TMPDIR
      bun install --frozen-lockfile
    '';
    installPhase = ''
      cp -r node_modules $out
    '';
    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    # Update this hash by running: nix build .#default 2>&1 | grep "got:"
    outputHash = "sha256-Q/hJ/6oH7CbUreNqDQqA3ks8dFIFHAhl0zP1fHcneTU=";
  };
in
pkgs.stdenv.mkDerivation rec {
  pname = "kanidm-oauth2-manager";
  version = "0.0.1";
  inherit src;

  nativeBuildInputs = [ pkgs.bun pkgs.makeWrapper ];

  # Bun embeds compiled JS as a special ELF section — stripping destroys it
  dontStrip = true;

  buildPhase = ''
    export HOME=$TMPDIR

    # Copy node_modules from the fixed-output derivation
    # (symlink won't work because the store is read-only)
    cp -r ${nodeDeps} node_modules
    chmod -R +w node_modules

    # Run svelte-kit sync, then vite build — via bun directly to avoid
    # needing nodejs in PATH (shell scripts in .bin/ use #!/usr/bin/env node)
    bun ./node_modules/@sveltejs/kit/src/cli.js sync
    bun ./node_modules/vite/bin/vite.js build

    # Patch handler.js to support STATIC_DIR env var
    substituteInPlace build/handler.js \
      --replace-fail \
        'const dir = path.dirname(fileURLToPath(import.meta.url));' \
        'const dir = process.env.STATIC_DIR || path.dirname(fileURLToPath(import.meta.url));'

    # Compile to a single binary
    bun build ./build/index.js --compile --outfile kanidm-oauth2-manager-bin
  '';

  installPhase = ''
    mkdir -p $out/bin $out/libexec $out/share/${pname}

    # Install static client assets
    cp -r build/client $out/share/${pname}/client

    # Install raw binary to libexec, then wrap it so STATIC_DIR is baked in
    install -Dm755 ./kanidm-oauth2-manager-bin $out/libexec/${pname}-bin
    makeWrapper $out/libexec/${pname}-bin $out/bin/${pname} \
      --set STATIC_DIR "$out/share/${pname}"
  '';

  meta = {
    description = "Web UI for managing Kanidm OAuth2 applications, groups, and users";
    homepage = "https://github.com/tricked-tech/kanidm-oauth2-manager";
    mainProgram = pname;
  };
}
