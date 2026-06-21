// src/utils/imageOptimizer.js
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const COMPRESSION_QUALITY = 0.7;
const MAX_SIZE_MB = 1;

export const optimizeImage = async (uri) => {
  try {
    // Obtenir les dimensions
    const info = await FileSystem.getInfoAsync(uri);
    const sizeInMB = info.size / (1024 * 1024);
    
    // Redimensionner si nécessaire
    let manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
      { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Vérifier la taille finale
    const finalInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    if (finalInfo.size / (1024 * 1024) > MAX_SIZE_MB) {
      // Recompresser plus fort
      manipulatedImage = await ImageManipulator.manipulateAsync(
        manipulatedImage.uri,
        [],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
    }
    
    return manipulatedImage.uri;
  } catch (error) {
    console.log('Image optimization error:', error);
    return uri;
  }
};

export const batchOptimizeImages = async (uris) => {
  const promises = uris.map(uri => optimizeImage(uri));
  return Promise.all(promises);
};

export const getImageSize = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return {
      uri,
      size: info.size,
      sizeInMB: (info.size / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    return null;
  }
};