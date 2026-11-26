import { compareNewestFirst, normaliseTitle } from './merge-show.ts';
import type { Episode, Show } from './show-types.ts';

function hasYoutubeVideo(episode: Episode): boolean {
  return episode.youtubeVideoId !== undefined && episode.youtubeUrl !== undefined;
}

function isSameEpisode(current: Episode, previous: Episode): boolean {
  if (current.id === previous.id) {
    return true;
  }
  return hasYoutubeVideo(current) !== hasYoutubeVideo(previous) && normaliseTitle(current.title) === normaliseTitle(previous.title);
}

function keepYoutubeVideo(current: Episode, previous: Episode): Episode {
  if (hasYoutubeVideo(current) || previous.youtubeVideoId === undefined || previous.youtubeUrl === undefined) {
    return current;
  }
  return {
    ...current,
    id: previous.id,
    youtubeUrl: previous.youtubeUrl,
    youtubeVideoId: previous.youtubeVideoId,
    thumbnail: previous.thumbnail,
  };
}

export function mergePreviousShow(current: Show, previous: Show): Show {
  const episodes = current.episodes.map((episode) => {
    const earlierCopy = previous.episodes.find((candidate) => isSameEpisode(episode, candidate));
    return earlierCopy === undefined ? episode : keepYoutubeVideo(episode, earlierCopy);
  });
  const droppedEpisodes = previous.episodes.filter(
    (candidate) => !current.episodes.some((episode) => isSameEpisode(episode, candidate)),
  );
  const currentClipIds = new Set(current.clips.map((clip) => clip.id));
  const droppedClips = previous.clips.filter((clip) => !currentClipIds.has(clip.id));

  return {
    description: current.description,
    episodes: [...episodes, ...droppedEpisodes].sort(compareNewestFirst),
    clips: [...current.clips, ...droppedClips].sort(compareNewestFirst),
  };
}
