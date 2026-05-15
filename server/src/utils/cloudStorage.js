import { v2 as cloudinary } from 'cloudinary';

import { HttpError } from './http.js';

let configured = false;

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const isAllowedImageMimeType = (mimetype) => allowedImageMimeTypes.has(String(mimetype ?? '').toLowerCase());

export const detectImageMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
};

export const assertValidImageUpload = ({ buffer, mimetype }, label = 'Image') => {
  const normalizedMimeType = String(mimetype ?? '').toLowerCase();
  if (!isAllowedImageMimeType(normalizedMimeType)) {
    throw new HttpError(400, `${label} must be a JPEG, PNG, or WebP image`);
  }

  const detectedMimeType = detectImageMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== normalizedMimeType) {
    throw new HttpError(400, `${label} file content does not match its image type`);
  }
};

const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, 'Cloud image storage is not configured');
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true
    });
    configured = true;
  }
};

const uploadImage = ({ buffer, mimetype, folder, publicId, transformation }) =>
  new Promise((resolve, reject) => {
    assertValidImageUpload({ buffer, mimetype });
    configureCloudinary();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        transformation
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new HttpError(502, 'Cloud image upload did not return a URL'));
          return;
        }

        resolve({
          contentType: mimetype,
          publicId: result.public_id,
          url: result.secure_url
        });
      }
    );

    stream.end(buffer);
  });

export const uploadTripCover = ({ buffer, mimetype, tripId, userId }) =>
  uploadImage({
    buffer,
    mimetype,
    folder: process.env.CLOUDINARY_FOLDER || 'traveloop/trip-covers',
    publicId: `user-${userId}-trip-${tripId}-${Date.now()}`,
    transformation: [
      { width: 1400, height: 900, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });

export const uploadAvatar = ({ buffer, mimetype, userId }) =>
  uploadImage({
    buffer,
    mimetype,
    folder: process.env.CLOUDINARY_AVATAR_FOLDER || 'traveloop/avatars',
    publicId: `user-${userId}-avatar-${Date.now()}`,
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });
