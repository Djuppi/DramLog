import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { MarkDefinition } from "../config/marks";

interface Props {
  def: MarkDefinition;
  unlocked: boolean;
}

export default function MarkBadge({ def, unlocked }: Props) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          unlocked ? styles.circleUnlocked : styles.circleLocked,
        ]}
      >
        <Svg width={48} height={48} viewBox="0 0 60 60">
          <Path
            d={def.svgPath}
            fill={unlocked ? "#C8963E" : "#C4B4A4"}
          />
        </Svg>
      </View>
      <Text
        style={[styles.name, !unlocked && styles.nameLocked]}
        numberOfLines={2}
      >
        {def.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2.5,
  },
  circleUnlocked: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C8963E",
    shadowColor: "#C8963E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  circleLocked: {
    backgroundColor: "#F5EFE6",
    borderColor: "#E0D4C8",
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A0E00",
    textAlign: "center",
    lineHeight: 15,
  },
  nameLocked: {
    color: "#B8A090",
  },
});
