import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, Image, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { api, MediaFile } from '../services/api';
import { Colors } from '../constants/colors';

export type { MediaFile };

interface Props {
  entity: 'tender' | 'order' | 'invoice' | 'inventory';
  entityId: number;
  files: MediaFile[];
  onRefresh: () => void;
}

function fileIcon(fileType: string): any {
  if (fileType.includes('pdf'))   return 'document-text-outline';
  if (fileType.includes('image')) return 'image-outline';
  if (fileType.includes('word') || fileType.includes('document')) return 'document-outline';
  if (fileType.includes('sheet') || fileType.includes('excel'))   return 'grid-outline';
  return 'attach-outline';
}

function fileIconColor(fileType: string): string {
  if (fileType.includes('pdf'))   return Colors.error;
  if (fileType.includes('image')) return Colors.info;
  if (fileType.includes('word') || fileType.includes('document')) return '#1565C0';
  if (fileType.includes('sheet') || fileType.includes('excel'))   return Colors.success;
  return Colors.textSecondary;
}

function fmtSize(bytes: string | null): string {
  if (!bytes) return '';
  const b = parseInt(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const SCREEN  = Dimensions.get('window');
const TOP_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 54;

export default function MediaSection({ entity, entityId, files, onRefresh }: Props) {
  const [uploading,   setUploading]   = useState(false);
  const [openingId,   setOpeningId]   = useState<number | null>(null);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [preview,     setPreview]     = useState<{ url: string; fileName: string } | null>(null);
  const [thumbnails,  setThumbnails]  = useState<Record<number, string>>({});

  // Auto-load presigned URLs for image files so thumbnails appear without tapping
  useEffect(() => {
    files.forEach(async (file) => {
      if (!file.fileType.includes('image')) return;
      if (thumbnails[file.id]) return; // already loaded
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        setThumbnails(prev => ({ ...prev, [file.id]: data.url }));
      } catch {
        // silently skip — icon fallback will show
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, entity]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append('entity', entity);
      formData.append('entityId', String(entityId));
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any);

      await api.post('/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onRefresh();
    } catch {
      Alert.alert('Upload failed', 'Could not upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (file: MediaFile) => {
    const isImage = file.fileType.includes('image');

    if (isImage) {
      // Reuse already-loaded thumbnail URL — no second round-trip
      if (thumbnails[file.id]) {
        setPreview({ url: thumbnails[file.id], fileName: file.fileName });
        return;
      }
      setOpeningId(file.id);
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        setThumbnails(prev => ({ ...prev, [file.id]: data.url }));
        setPreview({ url: data.url, fileName: file.fileName });
      } catch {
        Alert.alert('Error', 'Could not open file.');
      } finally {
        setOpeningId(null);
      }
    } else {
      setOpeningId(file.id);
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        await Linking.openURL(data.url);
      } catch {
        Alert.alert('Error', 'Could not open file.');
      } finally {
        setOpeningId(null);
      }
    }
  };

  const handleDelete = (file: MediaFile) => {
    Alert.alert(
      'Delete file',
      `Delete "${file.fileName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(file.id);
            try {
              await api.delete(`/api/media/${entity}/${file.id}`);
              onRefresh();
            } catch {
              Alert.alert('Error', 'Could not delete file.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attachments</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Ionicons name="attach-outline" size={14} color={Colors.accent} />}
          <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Attach file'}</Text>
        </TouchableOpacity>
      </View>

      {/* File list */}
      {files.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={28} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No attachments</Text>
        </View>
      ) : (
        files.map(file => {
          const isImage   = file.fileType.includes('image');
          const thumbUrl  = thumbnails[file.id];
          const hasThumb  = isImage && !!thumbUrl;

          return (
            <TouchableOpacity
              key={file.id}
              style={styles.fileRow}
              onPress={() => handleOpen(file)}
              activeOpacity={0.75}
            >
              {/* Thumbnail or icon */}
              <View style={[styles.thumb, hasThumb && styles.thumbImage]}>
                {hasThumb ? (
                  <Image
                    source={{ uri: thumbUrl }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                    onError={() =>
                      setThumbnails(prev => { const n = { ...prev }; delete n[file.id]; return n; })
                    }
                  />
                ) : isImage && !thumbUrl ? (
                  // Spinner while thumbnail loads
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <Ionicons name={fileIcon(file.fileType)} size={20} color={fileIconColor(file.fileType)} />
                )}
              </View>

              {/* File info */}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                <Text style={styles.fileMeta}>
                  {fmtSize(file.fileSize)}{file.fileSize ? ' · ' : ''}
                  {new Date(file.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </Text>
              </View>

              {/* View / loading indicator */}
              {openingId === file.id
                ? <ActivityIndicator size="small" color={Colors.info} style={{ width: 32 }} />
                : (
                  <View style={styles.actionBtn}>
                    <Ionicons
                      name={isImage ? 'eye-outline' : 'open-outline'}
                      size={16}
                      color={Colors.info}
                    />
                  </View>
                )}

              {/* Delete */}
              {deletingId === file.id
                ? <ActivityIndicator size="small" color={Colors.error} style={{ width: 32 }} />
                : (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); handleDelete(file); }}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                )}
            </TouchableOpacity>
          );
        })
      )}

      {/* Full-screen image preview modal */}
      {preview && (
        <Modal
          visible
          transparent={false}
          animationType="fade"
          onRequestClose={() => setPreview(null)}
          statusBarTranslucent
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { paddingTop: TOP_PAD }]}>
              <Text style={styles.modalFileName} numberOfLines={1}>{preview.fileName}</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(preview.url)}
                style={styles.modalIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreview(null)}
                style={styles.modalIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Image
                source={{ uri: preview.url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  title: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentLight, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent },

  empty: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 13, color: Colors.textMuted },

  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },

  // Thumbnail / icon box
  thumb: {
    width: 80, height: 80, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background, overflow: 'hidden',
  },
  thumbImage: {
    backgroundColor: '#000',
  },
  thumbImg: { width: 80, height: 80 },

  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  fileMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: '#1c1c1e',
  },
  modalFileName: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 8 },
  modalIconBtn: { padding: 8 },
  modalBody: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  previewImage: { width: SCREEN.width, height: SCREEN.height * 0.82 },
});
