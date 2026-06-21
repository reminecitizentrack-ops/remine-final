// src/components/ImagePicker.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';

const MAX_IMAGES = 5;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export const ImageUploader = ({ onImagesSelected, maxImages = MAX_IMAGES, initialImages = [] }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // ✅ CORRECTIF : requestPermissions wrap dans useCallback pour stabiliser
  // la référence et l'ajouter aux dépendances du useEffect
  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission nécessaire', 'Veuillez autoriser l\'accès à la galerie pour ajouter des photos');
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  const compressImage = async (uri, isVideo = false) => {
    if (isVideo) return uri;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const sizeInMB = info.size / (1024 * 1024);
      
      if (sizeInMB > MAX_SIZE_MB) {
        // Compression si trop lourde
        const compressed = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: true,
          quality: 0.5,
          base64: true,
        });
        return compressed.assets[0].uri;
      }
      return uri;
    } catch (error) {
      if (__DEV__) console.log('Erreur compression:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${maxImages} photos maximum`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri, result.assets[0].type === "video");
        const newImage = {
          id: Date.now().toString(),
          uri: compressedUri,
          base64: result.assets[0].base64,
          fileName: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg'
        };
        
        const newImages = [...images, newImage];
        setImages(newImages);
        onImagesSelected(newImages);
      }
    } catch (error) {
      if (__DEV__) console.log('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${maxImages} photos maximum`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission nécessaire', 'Veuillez autoriser l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
          fileName: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg'
        };
        
        const newImages = [...images, newImage];
        setImages(newImages);
        onImagesSelected(newImages);
      }
    } catch (error) {
      if (__DEV__) console.log('Erreur photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const removeImage = (imageId) => {
    Alert.alert(
      'Supprimer la photo',
      'Voulez-vous vraiment supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter(img => img.id !== imageId);
            setImages(newImages);
            onImagesSelected(newImages);
          }
        }
      ]
    );
  };


  const pickVideo = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limite atteinte', `Maximum ${maxImages} fichiers`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newMedia = {
          id: Date.now().toString(),
          uri: asset.uri,
          base64: null,
          fileName: `video_${Date.now()}.mp4`,
          type: 'video/mp4',
          isVideo: true,
          duration: asset.duration,
        };
        const newImages = [...images, newMedia];
        setImages(newImages);
        onImagesSelected(newImages);
      }
    } catch (error) {
      if (__DEV__) console.log('Erreur sélection vidéo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo');
    }
  };
  const viewImage = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const uploadImagesToServer = async (reportId) => {
    setUploading(true);
    try {
      const formData = new FormData();
      
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type,
          name: image.fileName,
        });
      });
      
      const response = await api.post(`/reports/${reportId}/upload-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data;
    } catch (error) {
      if (__DEV__) console.log('Erreur upload:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photos du signalement</Text>
      <Text style={styles.subLabel}>Ajoutez jusqu'à {maxImages} photos ({MAX_SIZE_MB}MB max)</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((image, index) => (
          <TouchableOpacity
            key={image.id}
            style={styles.imageContainer}
            onPress={() => viewImage(image)}
            onLongPress={() => removeImage(image.id)}
          >
            {image.isVideo ? (
              <View style={[styles.image, {backgroundColor:'#000', alignItems:'center', justifyContent:'center'}]}>
                <Text style={{fontSize:28}}>🎥</Text>
                {image.duration && <Text style={{color:'#fff', fontSize:10}}>{Math.round(image.duration)}s</Text>}
              </View>
            ) : (
              <Image source={{ uri: image.uri }} style={styles.image} />
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(image.id)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
            {index === 0 && <Text style={styles.mainBadge}>Principale</Text>}
          </TouchableOpacity>
        ))}
        
        {images.length < maxImages && (
          <TouchableOpacity style={styles.addButton} onPress={() => {
            Alert.alert(
              'Ajouter une photo',
              'Choisissez une option',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: '📷 Prendre une photo', onPress: takePhoto },
                { text: '🖼️ Choisir dans la galerie', onPress: pickImage },
                { text: '🎥 Choisir une vidéo', onPress: pickVideo }
              ]
            );
          }}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal pour visualiser l'image en grand */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage.uri }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#2ecc71" />
          <Text style={styles.uploadingText}>Upload des photos...</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: colors.textInverse,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addIcon: {
    fontSize: 32,
    color: colors.textMuted,
  },
  addText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: colors.textInverse,
    marginTop: 10,
  },
});