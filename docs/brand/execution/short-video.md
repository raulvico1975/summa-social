# Short Video Execution Contract

## Runtime

- HyperFrames HTML studio under video-studio/hyperframes
- render entrypoints through npm scripts only

## Allowed commands

- npm --prefix video-studio/hyperframes run video:list
- npm --prefix video-studio/hyperframes run video:test
- npm --prefix video-studio/hyperframes run video:lint
- npm --prefix video-studio/hyperframes run video:validate
- npm --prefix video-studio/hyperframes run video:render:piece -- <piece-id> --output <target>

## Artifact policy

- generated mp4 files must stay untracked
- thumbnails and snapshots must stay untracked
- only source html, scripts, prompts, and docs are committed

## Approval gate

The first reviewer is functional, not aesthetic:
the video must make sense to a person handling accounting and member management in a Catalan social entity.
