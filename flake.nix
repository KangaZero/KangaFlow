# SPDX-License-Identifier: Unlicense
# [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # Support a particular subset of the Nix systems
    systems = {
      inputs.nixpkgs.follows = "nixpkgs";
      url = "github:nix-systems/default";
    };

    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
      ...
    }@inputs:
    let
      forEachSystem =
        f: nixpkgs.lib.genAttrs (import systems) (system: f system nixpkgs.legacyPackages.${system});
    in
    {
      checks = forEachSystem (
        system: _pkgs: {
          pre-commit-check = inputs.git-hooks.lib.${system}.run {
            src = ./.;
            hooks = {
              # Nix hygiene.
              nixfmt.enable = true;
              statix.enable = true;
              deadnix.enable = true;

              # Single source of truth: run the project-pinned Biome from
              # node_modules so the hook, CI, and `just` all execute the same
              # binary (matches @biomejs/biome in package.json / nixpkgs).
              biome = {
                enable = true;
                settings.binPath = "./node_modules/.bin/biome";
              };
            };
          };
        }
      );

      devShells = forEachSystem (
        system: pkgs: {
          default = pkgs.mkShell {
            # shellHook = installs the git pre-commit hook defined above.
            inherit (self.checks.${system}.pre-commit-check) shellHook;

            packages = [
              # Node 26 (Current) — matches the GitHub Pages workflow.
              # TypeScript comes from node_modules (tsc = native TS7), so no
              # nix-provided typescript here — same single-binary rule as Biome.
              pkgs.nodejs_26
              pkgs.pnpm
              pkgs.just
            ]
            ++ self.checks.${system}.pre-commit-check.enabledPackages;
          };
        }
      );
    };
}
