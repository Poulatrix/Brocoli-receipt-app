import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Database sync will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Resizes an image (File, Blob, or base64 string) to a max width of 1000px
 * and converts it to WebP format.
 */
export async function convertAndResizeToWebp(
  input: File | Blob | string,
  maxWidth = 1000,
  quality = 0.85
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof input === 'string') {
      srcUrl = input;
    } else {
      srcUrl = URL.createObjectURL(input);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Impossible de créer le contexte 2D pour la conversion d'image."));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              mimeType: 'image/webp',
              extension: 'webp',
            });
          } else {
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve({
                    blob: fallbackBlob,
                    mimeType: 'image/jpeg',
                    extension: 'jpg',
                  });
                } else {
                  reject(new Error("Échec de la conversion de l'image."));
                }
              },
              'image/jpeg',
              0.85
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }
      reject(new Error("Impossible de charger l'image pour la conversion."));
    };

    img.src = srcUrl;
  });
}

/**
 * Uploads a File, Blob, or base64 image string to Supabase Storage
 * after converting it to WebP (max width 1000px) and returns its public URL.
 */
export async function uploadImageToSupabase(
  fileOrBase64: File | Blob | string,
  userId?: string | null
): Promise<string> {
  if (!fileOrBase64) return '';

  // If it's already a standard HTTP/HTTPS URL, return as is
  if (typeof fileOrBase64 === 'string') {
    if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
      return fileOrBase64;
    }
  }

  let blob: Blob;
  let mimeType = 'image/webp';
  let fileExt = 'webp';

  try {
    const processed = await convertAndResizeToWebp(fileOrBase64, 1000);
    blob = processed.blob;
    mimeType = processed.mimeType;
    fileExt = processed.extension;
  } catch (err) {
    console.warn("Conversion WebP/Redimensionnement échoué, utilisation de l'image brute:", err);
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        const matches = fileOrBase64.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          fileExt = mimeType.split('/')[1] || 'jpg';
          if (fileExt === 'jpeg') fileExt = 'jpg';
          const byteCharacters = atob(matches[2]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
        } else {
          return fileOrBase64;
        }
      } else {
        return fileOrBase64;
      }
    } else {
      blob = fileOrBase64;
      if (fileOrBase64 instanceof File && fileOrBase64.name) {
        const ext = fileOrBase64.name.split('.').pop();
        if (ext) fileExt = ext;
      }
      if (fileOrBase64.type) mimeType = fileOrBase64.type;
    }
  }

  const pathPrefix = userId ? `${userId}` : 'public';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${pathPrefix}/${uniqueName}`;

  const primaryBucket = 'recipe-images';

  const uploadRes = await supabase.storage
    .from(primaryBucket)
    .upload(filePath, blob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true
    });

  const activeBucket = primaryBucket;
  const finalPath = filePath;

  if (uploadRes.error) {
    console.error('Supabase Storage error:', uploadRes.error);
    const msg = uploadRes.error.message || '';
    if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('violates')) {
      throw new Error(
        `Accès refusé (RLS Supabase Storage). La politique d'upload doit vérifier le dossier utilisateur: (bucket_id = 'recipe-images' AND (auth.uid() = (storage.foldername(name))[1] OR auth.role() = 'authenticated')).`
      );
    }
    throw new Error(`Erreur Supabase Storage : ${msg}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(activeBucket)
    .getPublicUrl(finalPath);

  return publicUrlData.publicUrl;
}

