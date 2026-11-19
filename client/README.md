# AccessibleKYC (EquiSign) — Client Mobile SDK & Prototype

This directory is designated for the AccessibleKYC Client SDK.

## Architecture Highlights
* **Google MediaPipe Face Mesh:** Real-time tracking of 468 3D facial landmarks at 30–60 FPS directly on the client.
* **Tactile Haptic Radar:**
  * Uses native device haptics (`CoreHaptics` / `UIFeedbackGenerator` on iOS, `Vibrator` / LRA on Android).
  * Directs the user via palm vibrations without compromising auditory privacy in public spaces.
* **WCAG AAA Accessible UI:**
  * Maximum contrast boundaries, large-format target rings, and screen-reader accessibility.
* **Dual-Sensory Spoken Cues:**
  * Directional prompts (*"Tilt phone slightly up"*) as optional accessibility fallback.

## Recommended Frameworks
1. **iOS Native (Swift / SwiftUI)**: Full granular control over `CHHapticEngine` custom vibration waveforms.
2. **React Native (Bare / Expo with Native Modules)**: Cross-platform with `@react-native-community/cameraroll`, `react-native-vision-camera`, and `react-native-haptic-feedback`.
3. **Flutter**: Smooth 60 FPS rendering with `google_mlkit_face_mesh_detection` and native platform haptic channels.
