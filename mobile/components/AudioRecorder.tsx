import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  // Enable metering for audio level visualization
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder);

  // Create animated values for waveform bars (20 bars)
  const barAnimations = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.2))
  ).current;

  // Animated value for red dot pulsing
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const initializeRecording = async () => {
      try {
        // Request permissions
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          console.error("[AudioRecorder] Recording permission denied");
          onCancel();
          return;
        }

        // Set audio mode
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        // Prepare and start recording
        await recorder.prepareToRecordAsync();
        recorder.record();
      } catch (error) {
        console.error("Failed to start recording", error);
        onCancel();
      }
    };

    initializeRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate waveform bars based on metering or time
  useEffect(() => {
    if (!recorderState.isRecording) return;

    const animateBars = () => {
      // Use metering data if available, otherwise use animated random values
      const meterValue = recorderState.metering ?? 0;
      const baseLevel = meterValue > 0 ? Math.min(meterValue * 2, 1) : 0.2;

      const animations = barAnimations.map((anim, i) => {
        // Create variation for each bar
        const variation = (Math.sin(Date.now() / 200 + i * 0.5) + 1) / 2;
        const targetValue = baseLevel + variation * (1 - baseLevel) * 0.6;
        
        return Animated.timing(anim, {
          toValue: Math.max(0.1, Math.min(1, targetValue)),
          duration: 100,
          useNativeDriver: false, // height animation doesn't support native driver
        });
      });

      Animated.parallel(animations).start();
    };

    const interval = setInterval(animateBars, 100);
    return () => clearInterval(interval);
  }, [recorderState.isRecording, recorderState.metering, barAnimations]);

  // Pulse red dot animation
  useEffect(() => {
    if (!recorderState.isRecording) {
      dotScale.setValue(1);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [recorderState.isRecording, dotScale]);

  const stopRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;

        if (uri) {
          onRecordingComplete(uri);
        } else {
          console.error("[AudioRecorder] No recording URI available");
          onCancel();
        }
      } else {
        onCancel();
      }
    } catch (error) {
      console.error("Failed to stop recording", error);
      onCancel();
    }
  };

  const handleCancel = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
    } catch (error) {
      console.error("Failed to cancel recording", error);
    }
    onCancel();
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const duration = recorderState.durationMillis || 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancel}
        accessibilityLabel="Cancel recording"
        accessibilityRole="button"
      >
        <Ionicons name="trash" size={20} color="#FF3B30" />
      </TouchableOpacity>

      <View style={styles.recordingContainer}>
        <View style={styles.timerContainer}>
          <Animated.View
            style={[
              styles.redDot,
              {
                transform: [{ scale: dotScale }],
              },
            ]}
          />
          <Text style={styles.timer}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.waveform}>
          {barAnimations.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['4%', '80%'],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={stopRecording}
        disabled={!recorderState.isRecording}
        accessibilityLabel="Send recording"
        accessibilityRole="button"
      >
        <Ionicons name="send" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 60,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  timer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
