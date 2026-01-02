/**
 * Video quality profiles with bitrate ranges in MB/min
 * Format: [lowBitrate, highBitrate]
 */
export const qualityProfiles = {
  "720p": [3, 100],
  "1080p": [15, 150],
  "2160p": [35, 400],
} as const;

/** Type representing valid quality profile keys */
export type QualityProfile = keyof typeof qualityProfiles;
