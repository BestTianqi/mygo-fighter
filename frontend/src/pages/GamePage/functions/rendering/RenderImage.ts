/** ImageBitmap retains decoded pixels instead of re-decoding WebP during a draw. */
export type RenderImage = HTMLImageElement | ImageBitmap;

/** Keep the decoded surface where supported, while preserving image fallback. */
export async function retainRenderImage(
  image: HTMLImageElement,
): Promise<RenderImage> {
  if (typeof createImageBitmap !== "function") return image;
  try {
    return await createImageBitmap(image);
  } catch {
    return image;
  }
}

export function releaseRenderImage(image: RenderImage) {
  if ("close" in image) image.close();
}
