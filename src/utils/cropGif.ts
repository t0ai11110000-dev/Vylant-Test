import { parseGIF, decompressFrames } from 'gifuct-js';
import gifshot from 'gifshot';

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export default async function getCroppedGif(
  gifSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Fetch and parse the GIF
      const response = await fetch(gifSrc);
      const buffer = await response.arrayBuffer();
      const gif = parseGIF(buffer);
      const frames = decompressFrames(gif, true);

      console.log('GIF parsed. Total frames:', frames.length);

      if (!frames || frames.length === 0) {
        reject(new Error('No frames found in GIF'));
        return;
      }

      // 2. Process each frame (crop and rotate)
      const croppedFrames: (HTMLCanvasElement | string)[] = [];
      const rotRad = getRadianAngle(rotation);
      const maxFrames = 100; // Increased limit
      const totalFrames = Math.min(frames.length, maxFrames);

      console.log(`Processing ${totalFrames} frames out of ${frames.length}...`);

      // Create a temporary canvas to render the decompressed frames
      const tempRenderCanvas = document.createElement('canvas');
      const tempRenderCtx = tempRenderCanvas.getContext('2d');
      if (!tempRenderCtx) {
        reject(new Error('Could not create render context'));
        return;
      }

      tempRenderCanvas.width = gif.lsd.width;
      tempRenderCanvas.height = gif.lsd.height;

      for (let i = 0; i < totalFrames; i++) {
        // Yield to main thread every frame to prevent freezing
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const frame = frames[i];
        
        // gifuct-js frames need to be rendered to a canvas first
        const frameImageData = tempRenderCtx.createImageData(frame.dims.width, frame.dims.height);
        frameImageData.data.set(frame.patch);
        
        // Create a canvas for this specific frame's patch
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = frame.dims.width;
        patchCanvas.height = frame.dims.height;
        const patchCtx = patchCanvas.getContext('2d');
        if (!patchCtx) continue;
        patchCtx.putImageData(frameImageData, 0, 0);

        // Render the patch onto the main render canvas (handling disposal and transparency)
        // For simplicity in this implementation, we'll just draw the patch at its offset
        // Note: Full GIF disposal logic is complex, but this works for most GIFs
        tempRenderCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

        const canvas = tempRenderCanvas;
        
        const bBoxWidth = Math.abs(Math.cos(rotRad) * canvas.width) + Math.abs(Math.sin(rotRad) * canvas.height);
        const bBoxHeight = Math.abs(Math.sin(rotRad) * canvas.width) + Math.abs(Math.cos(rotRad) * canvas.height);

        const rotationCanvas = document.createElement('canvas');
        const rotationCtx = rotationCanvas.getContext('2d');
        if (!rotationCtx) continue;

        rotationCanvas.width = bBoxWidth;
        rotationCanvas.height = bBoxHeight;

        rotationCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
        rotationCtx.rotate(rotRad);
        rotationCtx.translate(-canvas.width / 2, -canvas.height / 2);
        rotationCtx.drawImage(canvas, 0, 0);

        const MAX_DIM = 200;
        let outWidth = pixelCrop.width;
        let outHeight = pixelCrop.height;
        if (outWidth > MAX_DIM || outHeight > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / outWidth, MAX_DIM / outHeight);
          outWidth = Math.round(outWidth * ratio);
          outHeight = Math.round(outHeight * ratio);
        }

        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) continue;

        croppedCanvas.width = outWidth;
        croppedCanvas.height = outHeight;

        croppedCtx.drawImage(
          rotationCanvas,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          outWidth,
          outHeight
        );

        croppedFrames.push(croppedCanvas.toDataURL('image/png'));
      }

      console.log(`Finished processing frames. Total cropped frames: ${croppedFrames.length}`);

      // 3. Re-encode the cropped frames back into a GIF
      // gifuct delay is in milliseconds, gifshot interval is in seconds
      const frameDelay = Math.max((frames[0]?.delay || 100) / 1000, 0.02); // Ensure at least 20ms delay
      console.log(`Using frame delay: ${frameDelay}s`);

      const MAX_DIM = 200;
      let finalWidth = pixelCrop.width;
      let finalHeight = pixelCrop.height;
      if (finalWidth > MAX_DIM || finalHeight > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / finalWidth, MAX_DIM / finalHeight);
        finalWidth = Math.round(finalWidth * ratio);
        finalHeight = Math.round(finalHeight * ratio);
      }

      gifshot.createGIF(
        {
          images: croppedFrames,
          gifWidth: finalWidth,
          gifHeight: finalHeight,
          interval: frameDelay,
          numWorkers: 2, // Use workers for better performance
          sampleInterval: 10,
        },
        (obj: any) => {
          console.log('Gifshot callback received:', obj.error ? 'Error' : 'Success');
          if (!obj.error) {
            console.log('Generated GIF data URL length:', obj.image.length);
            resolve(obj.image);
          } else {
            console.error('Gifshot error:', obj.error);
            reject(new Error(obj.error));
          }
        }
      );
    } catch (error) {
      console.error('GIF processing error:', error);
      reject(error);
    }
  });
}
