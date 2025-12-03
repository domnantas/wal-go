import { Team, TEAM_LABELS, TEAMS } from "@/constants/team";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

const ITEM_HEIGHT = 84;
const VISIBLE_ITEMS = 3;
const SPIN_DEADZONE_TRANSLATION = 28;
const SPIN_VELOCITY_THRESHOLD = 900;
const BASE_SPIN_CYCLES = 5;
const MAX_EXTRA_CYCLES = 7;
const BASE_SPIN_DURATION = 1200;
const HAPTIC_BEAT_MS = 260;
const REEL_LENGTH_MULTIPLIER = 40;

type TimerSet = Set<ReturnType<typeof setTimeout>>;

interface TeamWheelProps {
  onTeamSelected: (team: Team) => void;
  disabled?: boolean;
}

export function TeamWheel({ onTeamSelected, disabled }: TeamWheelProps) {
  const teamsOnReel = useMemo(
    () =>
      Array.from(
        { length: TEAMS.length * REEL_LENGTH_MULTIPLIER },
        (_, index) => TEAMS[index % TEAMS.length]
      ),
    []
  );

  const centerIndex = Math.floor(teamsOnReel.length / 2);
  const initialOffset = -(centerIndex * ITEM_HEIGHT);

  const translateY = useSharedValue(initialOffset);
  const offsetRef = useRef(initialOffset);
  const dragStartRef = useRef(initialOffset);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const completionTimers = useRef<TimerSet>(new Set());
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const addTimer = useCallback((callback: () => void, duration: number) => {
    const timer = setTimeout(() => {
      completionTimers.current.delete(timer);
      callback();
    }, duration);

    completionTimers.current.add(timer);
  }, []);

  const clearTimers = useCallback(() => {
    completionTimers.current.forEach((timer) => clearTimeout(timer));
    completionTimers.current.clear();
  }, []);

  const stopSpinHaptics = useCallback(() => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
  }, []);

  const startSpinHaptics = useCallback(() => {
    stopSpinHaptics();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hapticIntervalRef.current = setInterval(() => {
      Haptics.selectionAsync();
    }, HAPTIC_BEAT_MS);
  }, [stopSpinHaptics]);

  useEffect(() => {
    return () => {
      stopSpinHaptics();
      clearTimers();
    };
  }, [clearTimers, stopSpinHaptics]);

  const animateTo = useCallback(
    (
      offset: number,
      duration: number,
      onComplete?: () => void,
      easing: (value: number) => number = Easing.out(Easing.cubic)
    ) => {
      translateY.value = withTiming(offset, { duration, easing });
      offsetRef.current = offset;

      if (onComplete) {
        addTimer(onComplete, duration);
      }
    },
    [addTimer, translateY]
  );

  const clampIndex = useCallback(
    (index: number) => {
      if (index < 0) return 0;
      if (index >= teamsOnReel.length) return teamsOnReel.length - 1;
      return index;
    },
    [teamsOnReel.length]
  );

  const finalizeSelection = useCallback(
    (team: Team) => {
      stopSpinHaptics();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTeamSelected(team);
      setIsSpinning(false);
    },
    [onTeamSelected, stopSpinHaptics]
  );

  const snapToNearest = useCallback(
    (targetOffset: number, finalize: boolean) => {
      const nearestIndex = clampIndex(Math.round(-targetOffset / ITEM_HEIGHT));
      const snappedOffset = -(nearestIndex * ITEM_HEIGHT);
      const team = teamsOnReel[nearestIndex];

      animateTo(
        snappedOffset,
        360,
        finalize ? () => finalizeSelection(team) : undefined
      );
    },
    [animateTo, clampIndex, finalizeSelection, teamsOnReel]
  );

  const snapToInitial = useCallback(() => {
    animateTo(initialOffset, 280);
  }, [animateTo, initialOffset]);

  const startSpin = useCallback(
    (direction: number, strength: number) => {
      if (disabled || isSpinning) return;

      setIsSpinning(true);
      startSpinHaptics();

      const normalizedStrength = Math.min(Math.max(strength, 0.7), 5);
      const extraCycles = Math.round(
        Math.min(normalizedStrength * 1.6, MAX_EXTRA_CYCLES)
      );
      const randomDrift = (Math.random() - 0.5) * ITEM_HEIGHT;
      const totalCycles = BASE_SPIN_CYCLES + extraCycles;
      const travel = direction * (totalCycles * ITEM_HEIGHT + randomDrift);
      const duration =
        BASE_SPIN_DURATION + Math.min(normalizedStrength * 500, 1600);

      const spinTarget = offsetRef.current + travel;
      animateTo(spinTarget, duration, () => snapToNearest(spinTarget, true));
    },
    [animateTo, disabled, isSpinning, snapToNearest, startSpinHaptics]
  );

  const handleGestureEnd = useCallback(
    (velocityY: number, translationY: number) => {
      setIsDragging(false);

      if (disabled || isSpinning) {
        return;
      }

      const travel = Math.abs(translationY);
      const velocity = Math.abs(velocityY);
      const isInDeadzone =
        travel < SPIN_DEADZONE_TRANSLATION &&
        velocity < SPIN_VELOCITY_THRESHOLD;
      if (isInDeadzone) {
        snapToInitial();
        return;
      }
      const shouldSpin =
        velocity > SPIN_VELOCITY_THRESHOLD || travel > ITEM_HEIGHT;

      if (!shouldSpin) {
        snapToInitial();
        return;
      }

      const direction =
        velocityY === 0 && translationY === 0
          ? -1
          : velocityY === 0 && translationY !== 0
          ? translationY > 0
            ? 1
            : -1
          : velocityY > 0
          ? 1
          : -1;

      const strengthFromVelocity = velocity / 900;
      const strengthFromTravel = travel / ITEM_HEIGHT;
      const spinStrength = Math.max(
        strengthFromVelocity,
        strengthFromTravel * 0.8
      );

      startSpin(direction, spinStrength);
    },
    [disabled, isSpinning, snapToInitial, startSpin]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && !isSpinning)
        .runOnJS(true)
        .onBegin(() => {
          setIsDragging(true);
          dragStartRef.current = offsetRef.current;
        })
        .onUpdate((event) => {
          const nextOffset = dragStartRef.current + event.translationY;
          translateY.value = nextOffset;
          offsetRef.current = nextOffset;
        })
        .onEnd((event) => {
          handleGestureEnd(event.velocityY, event.translationY);
        })
        .onFinalize(() => {
          setIsDragging(false);
        }),
    [disabled, handleGestureEnd, isSpinning, translateY]
  );

  const handleButtonSpin = useCallback(() => {
    const randomStrength = 7 + Math.random() * 2;
    startSpin(-1, randomStrength);
  }, [startSpin]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.slotContainer,
            isDragging && styles.slotContainerActive,
          ]}
        >
          <View style={styles.slotWindow}>
            <Animated.View style={[styles.reel, reelStyle]}>
              {teamsOnReel.map((team, index) => (
                <View key={`${team}-${index}`} style={[styles.item(team)]}>
                  <Text style={styles.itemText}>{TEAM_LABELS[team]}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          <View pointerEvents="none" style={styles.indicatorRow}>
            <View style={[styles.triangleLeft]} />
            <View style={[styles.triangleRight]} />
          </View>
        </View>
      </GestureDetector>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.spinButton,
          (pressed || isDragging) && styles.spinButtonPressed,
          (isSpinning || disabled) && styles.spinButtonDisabled,
        ]}
        onPress={handleButtonSpin}
        disabled={isSpinning || disabled}
      >
        <Text style={styles.spinButtonText}>
          {isSpinning ? "Sukasi..." : "Sukti"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const TEAM_COLOR_MAP = {
    yellow: theme.colors.teamYellow,
    green: theme.colors.teamGreen,
    red: theme.colors.teamRed,
  };
  return {
    container: {
      alignItems: "center",
      gap: 20,
    },
    slotContainer: {
      width: 260,
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 2,
      position: "relative",
      borderColor: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    slotContainerActive: {
      transform: [{ scale: 0.995 }],
    },
    slotWindow: {
      flex: 1,
      overflow: "hidden",
    },
    reel: {
      position: "absolute",
      top: ITEM_HEIGHT,
      left: 0,
      right: 0,
    },
    item: (teamColor: Team) => ({
      height: ITEM_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: TEAM_COLOR_MAP[teamColor],
    }),
    itemText: {
      fontSize: 22,
      fontWeight: "800",
      color: "#000000",
      letterSpacing: 1,
    },
    indicatorRow: {
      position: "absolute",
      top: (ITEM_HEIGHT * VISIBLE_ITEMS) / 2 - 20,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      zIndex: 12,
    },
    triangleLeft: {
      width: 0,
      height: 0,
      borderTopWidth: 20,
      borderTopColor: "transparent",
      borderBottomWidth: 20,
      borderBottomColor: "transparent",
      borderLeftWidth: 28,
      borderLeftColor: theme.colors.text,
    },
    triangleRight: {
      width: 0,
      height: 0,
      borderTopWidth: 20,
      borderTopColor: "transparent",
      borderBottomWidth: 20,
      borderBottomColor: "transparent",
      borderRightWidth: 28,
      borderRightColor: theme.colors.text,
    },
    spinButton: {
      paddingHorizontal: 36,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.tint,
    },
    spinButtonPressed: {
      opacity: 0.85,
    },
    spinButtonDisabled: {
      opacity: 0.5,
    },
    spinButtonText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  };
});
