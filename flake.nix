# SPDX-License-Identifier: MIT
# [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # Support a particular subset of the Nix systems
    systems = {
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
        system: pkgs: {
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
              just-hook = {
                enable = true;
                name = "just hook";
                entry = "${pkgs.writeShellScriptBin "just-hook" ''
                  just review-count
                  # Nudge only (never blocks the commit): remind to refresh the
                  # README image when UI files are staged. Screenshot stays a
                  # manual `just screenshot` so PNG blobs don't bloat git history.
                  if git diff --cached --name-only | grep -qE '^(app|components)/'; then
                    echo "note: UI files staged - refresh the README image with: just screenshot"
                  fi
                ''}/bin/just-hook";
                language = "system";
                pass_filenames = false;
                always_run = true;
                stages = [ "pre-commit" ];
              };

              # Pre-push type gate: run the same `tsc --noEmit` as CI so a clean
              # checkout (no generated next-env.d.ts) can't slip type errors past
              # `git push`. Mirrors `just typecheck`.
              typecheck = {
                enable = true;
                name = "typecheck";
                entry = "${pkgs.writeShellScriptBin "typecheck-hook" ''
                  just typecheck
                ''}/bin/typecheck-hook";
                language = "system";
                pass_filenames = false;
                always_run = true;
                stages = [ "pre-push" ];
              };

              # Pre-push guard: reject any incoming commit whose author OR
              # committer is not the personal identity. Keeps work identity out
              # of this repo's history for good.
              check-author = {
                enable = true;
                name = "check git author";
                # writeShellScriptBin puts the binary at $out/bin/<name>, so the
                # entry must suffix /bin/check-author (the drv alone is $out).
                entry = "${pkgs.writeShellScriptBin "check-author" ''
                  expected="samuelyongw@gmail.com"
                  zero="0000000000000000000000000000000000000000"
                  while IFS=' ' read -r _local_ref local_sha _remote_ref remote_sha; do
                    # Skip branch deletions.
                    [ "$local_sha" = "$zero" ] && continue

                    # Isolate only the new incoming commits.
                    if [ "$remote_sha" = "$zero" ]; then
                      commits=$(git rev-list "$local_sha" --not --remotes 2>/dev/null)
                    else
                      commits=$(git rev-list "$remote_sha..$local_sha" 2>/dev/null)
                    fi

                    [ -z "$commits" ] && continue

                    while IFS= read -r commit; do
                      IFS='|' read -r author_email committer_email <<< "$(git log -1 --format="%ae|%ce" "$commit" 2>/dev/null)"

                      if [ "$author_email" != "$expected" ]; then
                        echo "Push rejected: $commit not authored by KangaZero <$expected> (got: $author_email)"
                        exit 1
                      fi
                      if [ "$committer_email" != "$expected" ]; then
                        echo "Push rejected: $commit not committed by KangaZero <$expected> (got: $committer_email)"
                        exit 1
                      fi
                    done <<< "$commits"
                  done
                ''}/bin/check-author";
                language = "system";
                pass_filenames = false;
                always_run = true;
                stages = [ "pre-push" ];
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
