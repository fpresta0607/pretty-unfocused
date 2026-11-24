export interface Thumbnail {
  src: string;
  width: number;
  height: number;
  srcset?: string;
}

export interface Episode {
  id: string;
  title: string;
  publishedAt: string;
  description: string;
  number?: number;
  durationSeconds?: number;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  spotifyUrl?: string;
  thumbnail: Thumbnail;
}

export interface Clip {
  id: string;
  title: string;
  publishedAt: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnail: Thumbnail;
}

export interface Show {
  description: string;
  episodes: Episode[];
  clips: Clip[];
}
