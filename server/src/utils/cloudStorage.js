import { v2 as cloudinary } from 'cloudinary';

import { HttpError } from './http.js';

let configured = false;

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

export const uploadTripCover = ({ buffer, mimetype, tripId, userId }) =>
  new Promise((resolve, reject) => {
    configureCloudinary();

    const folder = process.env.CLOUDINARY_FOLDER || 'traveloop/trip-covers';
    const publicId = `user-${userId}-trip-${tripId}-${Date.now()}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: [
          { width: 1400, height: 900, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
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
