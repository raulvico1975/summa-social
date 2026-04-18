# Blog Cover Execution Contract

## Runtime order

1. Nano Banana wrapper
2. Gemini image API
3. SVG fallback

## Wrapper CLI contract

Required flag order:

1. --prompt-file
2. --filename
3. --aspect-ratio
4. --resolution
5. --api-key
6. --input-image

The input-image flag is repeatable and is passed once per approved reference asset.

## Final engine contract

The wrapper currently forwards only the flags supported by the installed Nano Banana engine:

- --prompt
- --filename
- --resolution
- --api-key when present
- every --input-image

The wrapper does not forward --aspect-ratio today because the current engine script does not accept that flag.
Aspect ratio is expressed in the generated prompt and kept in the wrapper CLI for contract stability and future engine compatibility.

## Failure policy

- Wrapper failure must not break the editorial flow.
- Runtime falls back to Gemini and then to SVG fallback.
- Missing reference images do not fail the flow; they are filtered before invocation.
