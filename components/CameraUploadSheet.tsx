/**
 * CameraUploadSheet — reusable camera / gallery upload modal
 *
 * Drop-in for any module that needs photo capture:
 *
 *   <CameraUploadSheet
 *     visible={show}
 *     entity="order"
 *     entityId={order.id}
 *     onClose={() => setShow(false)}
 *     onUploaded={loadOrder}   // refresh callback
 *   />
 *
 * Flow:
 *   1. Bottom sheet slides up → user picks Camera or Gallery
 *   2. Preview grid shows selected image(s)
 *   3. User can remove individual previews, retake, or add more
 *   4. Tap Upload → compressed + uploaded → sheet closes, onUploaded fires
 */

import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Image,
  ScrollView, ActivityIndicator, Alert, Platform, Dimensions,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/colors';
import {
  useMediaUpload, MediaEntity, UploadInput,
  ALLOWED_MIME_TYPES, ALLOWED_MIME_SET,
} from '../hooks/useMediaUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  visible:    boolean;
  entity:     MediaEntity;
  entityId:   number;
  onClose:    () => void;
  onUploaded: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function assetToInput(asset: ImagePicker.ImagePickerAsset, index = 0): UploadInput {
  const ext  = asset.mimeType?.split('/')[1] ?? 'jpg';
  const name = asset.fileName ?? `photo_${Date.now()}_${index}.${ext}`;
  return { uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' };
}

async function requestCamera(): Promise<boolean> {
  if (Platform.OS === 'web') return true; // browser handles permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera permission needed',
      'Please allow camera access in your device settings.',
    );
    return false;
  }
  return true;
}


// ── Component ─────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');

export default function CameraUploadSheet({
  visible, entity, entityId, onClose, onUploaded,
}: Props) {
  const [previews, setPreviews] = useState<UploadInput[]>([]);
  const { upload, uploading, progress, error, clearError } = useMediaUpload(entity, entityId);

  // ── Pickers ────────────────────────────────────────────────────────────────

  const openCamera = async (append = false) => {
    if (!(await requestCamera())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const captured = assetToInput(result.assets[0]);
      setPreviews(prev => append ? [...prev, captured] : [captured]);
    }
  };


  // ── Files (document picker — PDFs, Office, images) ────────────────────────

  const handleFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...ALLOWED_MIME_TYPES],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const valid = result.assets.filter(a => !a.mimeType || ALLOWED_MIME_SET.has(a.mimeType));
    if (!valid.length) return;

    const inputs: UploadInput[] = valid.map(a => ({
      uri:      a.uri,
      name:     a.name,
      mimeType: a.mimeType || 'application/octet-stream',
    }));

    clearError();
    const ok = await upload(inputs);
    if (ok) { handleClose(); onUploaded(); }
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    clearError();
    const ok = await upload(previews);
    if (ok) {
      handleClose();
      onUploaded();
    }
  };

  // ── Close / reset ──────────────────────────────────────────────────────────

  const handleClose = () => {
    if (uploading) return;
    setPreviews([]);
    clearError();
    onClose();
  };

  const removePreview = (index: number) =>
    setPreviews(prev => prev.filter((_, i) => i !== index));

  // ── Render ─────────────────────────────────────────────────────────────────

  const isPreviewStage = previews.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        {/* Tap-to-dismiss backdrop */}
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={s.sheet}>
          {/* ── Handle ────────────────────────────────────────────────────── */}
          <View style={s.handle} />

          {/* ── Header ────────────────────────────────────────────────────── */}
          <View style={s.header}>
            <Text style={s.title}>
              {uploading && !isPreviewStage
                ? 'Uploading…'
                : isPreviewStage
                  ? `${previews.length} photo${previews.length > 1 ? 's' : ''} selected`
                  : 'Attach File'}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={uploading} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={uploading ? Colors.textMuted : Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color="#fff" />
              <Text style={s.errorText} numberOfLines={2}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Upload progress screen (Files uploading) ─────────────────── */}
          {uploading && !isPreviewStage && progress && (
            <View style={s.uploadScreen}>
              <View style={s.uploadIconWrap}>
                <Ionicons name="cloud-upload-outline" size={36} color={Colors.accent} />
              </View>
              <Text style={s.uploadCountText}>
                Uploading file {progress.done + 1} of {progress.total}
              </Text>
              <View style={s.barBg}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.round((progress.done / progress.total) * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={s.barPct}>
                {Math.round((progress.done / progress.total) * 100)}%
              </Text>
              <Text style={s.uploadHint}>Please wait — do not close this window</Text>
            </View>
          )}

          {/* ── Source picker (step 1) ────────────────────────────────────── */}
          {!isPreviewStage && !uploading && (
            <View style={s.optionRow}>
              {/* Camera — hidden on web desktop where no camera input exists */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={s.optionCard} onPress={openCamera} activeOpacity={0.8}>
                  <View style={[s.optionIcon, { backgroundColor: Colors.accentLight }]}>
                    <Ionicons name="camera-outline" size={30} color={Colors.accent} />
                  </View>
                  <Text style={s.optionLabel}>Camera</Text>
                  <Text style={s.optionSub}>Take a new photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.optionCard} onPress={handleFiles} activeOpacity={0.8}>
                <View style={[s.optionIcon, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="document-attach-outline" size={30} color={Colors.success} />
                </View>
                <Text style={s.optionLabel}>Files</Text>
                <Text style={s.optionSub}>Photos, PDF, Office…</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Preview grid (step 2) ─────────────────────────────────────── */}
          {isPreviewStage && (
            <View style={s.previewSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.previewScroll}
              >
                {previews.map((p, i) => (
                  <View key={`${p.uri}-${i}`} style={s.previewCard}>
                    <Image
                      source={{ uri: p.uri }}
                      style={s.previewImg}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={s.removeBadge}
                      onPress={() => removePreview(i)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add more — appends another camera photo to existing previews */}
                <TouchableOpacity style={s.addMoreTile} onPress={() => openCamera(true)} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={28} color={Colors.textMuted} />
                  <Text style={s.addMoreText}>Add more</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Upload progress bar */}
              {uploading && progress && (
                <View style={s.progressRow}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                  <Text style={s.progressText}>
                    Uploading {progress.done} of {progress.total}…
                  </Text>
                  <Text style={s.progressPct}>
                    {Math.round((progress.done / progress.total) * 100)}%
                  </Text>
                </View>
              )}

              {/* Action row */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.retakeBtn}
                  onPress={() => setPreviews([])}
                  disabled={uploading}
                >
                  <Ionicons name="arrow-undo-outline" size={16} color={Colors.textSecondary} />
                  <Text style={s.retakeText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.uploadBtn, uploading && s.uploadBtnDisabled]}
                  onPress={handleUpload}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#111" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#111" />
                      <Text style={s.uploadBtnText}>
                        Upload {previews.length > 1 ? `${previews.length} photos` : 'photo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SHEET_MAX = SCREEN_H * 0.62;

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SHEET_MAX,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },

  // ── Source picker ──────────────────────────────────────────────────────────
  optionRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 24, paddingHorizontal: 32, paddingVertical: 32,
  },
  optionCard: {
    flex: 1, maxWidth: 200,
    alignItems: 'center', gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: Colors.border,
  },
  optionIcon:  { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  optionSub:   { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },

  // ── Preview grid ───────────────────────────────────────────────────────────
  previewSection: { paddingTop: 8 },

  previewScroll: {
    paddingHorizontal: 16, paddingVertical: 12, gap: 10, flexDirection: 'row',
  },
  previewCard: { position: 'relative' },
  previewImg:  { width: 110, height: 110, borderRadius: 10, backgroundColor: Colors.background },
  removeBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: Colors.surface, borderRadius: 11,
  },

  addMoreTile: {
    width: 110, height: 110, borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addMoreText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
  },
  progressText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  progressPct:  { fontSize: 13, fontWeight: '700', color: Colors.accent },

  // ── Files upload progress screen ───────────────────────────────────────────
  uploadScreen: {
    alignItems: 'center', paddingHorizontal: 32, paddingVertical: 36, gap: 14,
  },
  uploadIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  uploadCountText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  barBg: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: Colors.background, overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  barPct:  { fontSize: 22, fontWeight: '800', color: Colors.accent },
  uploadHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },

  // ── Action row ─────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingTop: 8,
  },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  retakeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  uploadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 10,
    backgroundColor: Colors.accent,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText:     { fontSize: 14, fontWeight: '700', color: '#111' },
});
