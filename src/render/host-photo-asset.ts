export const HOST_PHOTO_WIDTH = 720;
export const HOST_PHOTO_HEIGHT = 864;
export const HOST_PHOTO_SMALL_WIDTH = 360;

function buildHostPhoto(modifier: 'maya' | 'gia') {
  const src = `/src/assets/host-${modifier}.webp`;
  const smallSrc = `/src/assets/host-${modifier}-small.webp`;
  return { src, srcset: `${smallSrc} ${HOST_PHOTO_SMALL_WIDTH}w, ${src} ${HOST_PHOTO_WIDTH}w` };
}

export const HOST_PHOTOS = { maya: buildHostPhoto('maya'), gia: buildHostPhoto('gia') } as const;
