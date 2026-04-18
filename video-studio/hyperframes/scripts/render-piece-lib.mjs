function fail(message) {
  throw new Error(message);
}

const DELIVERY_PROFILES = {
  'web-premium': ['--quality', 'high', '--video-bitrate', '10M'],
};

function isQualityOverrideFlag(token) {
  return token === '--quality' || token === '--crf' || token === '--video-bitrate';
}

export function parseRenderPieceArgs(argv) {
  const parsed = {
    pieceId: null,
    profile: null,
    passthrough: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!parsed.pieceId && !token.startsWith('--')) {
      parsed.pieceId = token;
      continue;
    }

    if (token === '--profile') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        fail('Missing value for --profile.');
      }
      parsed.profile = value;
      index += 1;
      continue;
    }

    parsed.passthrough.push(token);
  }

  return parsed;
}

export function buildHyperframesRenderCommand(runtimeRoot, { profile, passthrough = [] } = {}) {
  const command = ['npx', 'hyperframes', 'render', runtimeRoot];

  if (profile) {
    const profileFlags = DELIVERY_PROFILES[profile];
    if (!profileFlags) {
      fail(`Unknown render profile "${profile}". Available: ${Object.keys(DELIVERY_PROFILES).join(', ')}.`);
    }

    if (passthrough.some((token) => isQualityOverrideFlag(token))) {
      fail(`Profile "${profile}" cannot be combined with --quality, --crf, or --video-bitrate.`);
    }

    command.push(...profileFlags);
  }

  command.push(...passthrough);
  return command;
}
