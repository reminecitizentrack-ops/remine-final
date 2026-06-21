// src/components/PhotoPicker.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const PhotoPicker = ({ photos = [], onPhotosChange, maxPhotos = 5, disabled = false }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [previewImage, setPreviewImage] = useState(null);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra pour prendre des photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
        }));
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie.');
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const openPreview = (uri) => {
    setPreviewImage(uri);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 Photos du signalement</Text>
      <Text style={styles.subtitle}>
        Ajoutez jusqu'à {maxPhotos} photos ({photos.length}/{maxPhotos})
      </Text>

      {/* Boutons d'action */}
      {photos.length < maxPhotos && !disabled && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, disabled && styles.buttonDisabled]} 
            onPress={takePhoto}
            disabled={disabled}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.buttonText}>Prendre une photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.galleryButton, disabled && styles.buttonDisabled]} 
            onPress={pickFromGallery}
            disabled={disabled}
          >
            <Ionicons name="images" size={20} color="white" />
            <Text style={styles.buttonText}>Choisir de la galerie</Text>
          </TouchableOpacity>
        </View>
      )}

      {disabled && photos.length === 0 && (
        <Text style={styles.disabledText}>
          Connectez-vous pour ajouter des photos
        </Text>
      )}

      {/* Galerie des photos */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <TouchableOpacity onPress={() => openPreview(photo.uri)}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
              </TouchableOpacity>
              {!disabled && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              )}
              <Text style={styles.photoNumber}>{index + 1}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal de prévisualisation */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={closePreview}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Image source={{ uri: previewImage }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  disabledText: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.blue,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  galleryButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  gallery: {
    flexDirection: 'row',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ecf0f1',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  photoNumber: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontSize: 10,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
});

export default PhotoPicker;