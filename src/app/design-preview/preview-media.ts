export const PREVIEW_MEDIA_LIMIT = 10;

export function addPreviewImage(images: string[], image: string) {
  return images.length >= PREVIEW_MEDIA_LIMIT ? images : [...images, image];
}

export function setPreviewCover(images: string[], image: string) {
  return images.includes(image)
    ? [image, ...images.filter((item) => item !== image)]
    : images;
}

export function movePreviewImage(
  images: string[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (
    index < 0 ||
    index >= images.length ||
    target < 0 ||
    target >= images.length
  )
    return images;
  const next = [...images];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function removePreviewImage(images: string[], image: string) {
  return images.filter((item) => item !== image);
}
