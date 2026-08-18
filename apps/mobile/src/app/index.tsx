import { colors, spacing } from "@dajeong/design-tokens";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const recoverySteps = ["상황 공유", "대안 비교", "함께 결정"] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View accessibilityElementsHidden style={styles.brandMark}>
              <Text style={styles.brandMarkText}>다</Text>
            </View>
            <Text style={styles.brandName}>다정</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>여행 복구 준비 완료</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>
            여행이 꼬인 순간,{"\n"}다정하게 다시 맞춰요.
          </Text>
          <Text style={styles.description}>
            갑작스러운 비와 휴관에도 모두의 취향과 이동 시간을 살펴, 지금
            가능한 다음 일정을 함께 고를 수 있어요.
          </Text>

          <View style={styles.stepList}>
            {recoverySteps.map((step, index) => (
              <View key={step} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusEyebrow}>MOBILE FOUNDATION</Text>
              <Text style={styles.statusTitle}>Expo Router가 연결됐어요</Text>
              <Text style={styles.statusDescription}>
                웹과 같은 색상·간격 토큰을 사용하되 화면 코드는 모바일에 맞게
                분리했습니다.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  content: {
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 680,
    width: "100%",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.action.primary,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandMarkText: {
    color: colors.text.onAction,
    fontSize: 20,
    fontWeight: "800",
  },
  brandName: {
    color: colors.text.primary,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent.warm,
    borderRadius: 999,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: colors.text.primary,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: spacing.md,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 17,
    lineHeight: 27,
    marginBottom: spacing.xl,
    maxWidth: 570,
  },
  stepList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  stepItem: {
    alignItems: "center",
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepNumber: {
    alignItems: "center",
    backgroundColor: colors.action.primary,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  stepNumberText: {
    color: colors.text.onAction,
    fontSize: 12,
    fontWeight: "800",
  },
  stepText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  statusCard: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  statusDot: {
    backgroundColor: colors.action.primary,
    borderRadius: 999,
    height: 12,
    marginTop: spacing.xs,
    width: 12,
  },
  statusCopy: {
    flex: 1,
  },
  statusEyebrow: {
    color: colors.action.primaryPressed,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  statusTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  statusDescription: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
