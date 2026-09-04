/**
 * Utility functions for safe API communication and image compression.
 */

export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error("Network connection error. Please check your internet connection and try again.");
  }

  const responseText = await res.text();
  let json: any = null;

  if (responseText) {
    try {
      json = JSON.parse(responseText);
    } catch (_) {
      // Handle cases where the server returns non-JSON text (e.g. HTML error pages from Vercel / Nginx / Cloud Run)
      if (res.status === 413 || responseText.toLowerCase().includes("payload")) {
        throw new Error("The request payload or uploaded image is too large for the server. Please try uploading a smaller image.");
      }
      if (res.status === 503 || responseText.toLowerCase().includes("high demand") || responseText.toLowerCase().includes("overloaded")) {
        throw new Error("The AI service is temporarily experiencing high demand. Please try again in a moment.");
      }
      if (res.status === 404) {
        throw new Error("API route not found on server (404). Please ensure the backend server is running.");
      }
      
      const cleanSnippet = responseText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Error(`Server error (${res.status}): ${cleanSnippet || "The page cannot be displayed."}`);
    }
  }

  if (!res.ok) {
    const errorMsg = json?.error || json?.message || `Server error (${res.status})`;
    throw new Error(errorMsg);
  }

  return json as T;
}

/**
 * Resizes and compresses image files before sending to server endpoints,
 * preventing Vercel / proxy 413 Payload Too Large errors.
 */
export function compressImageFile(
  file: File, 
  maxWidth = 1600, 
  maxHeight = 1600, 
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, mimeType: file.type });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({ dataUrl, mimeType });
      };
      img.onerror = () => resolve({ dataUrl: e.target?.result as string, mimeType: file.type });
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
