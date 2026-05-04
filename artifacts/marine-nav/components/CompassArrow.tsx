import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Polygon,
  Text as SvgText,
  G,
} from 'react-native-svg';

import { useColors } from '@/hooks/useColors';

interface Props {
  heading: number;
  destinationBearing?: number | null;
  size?: number;
}

const SPRING = { damping: 20, stiffness: 120 };

export function CompassArrow({ heading, destinationBearing, size = 280 }: Props) {
  const colors = useColors();
  const rotation = useSharedValue(heading);
  const arrowRotation = useSharedValue(0);

  useEffect(() => {
    const normalized = ((heading % 360) + 360) % 360;
    rotation.value = withSpring(normalized, SPRING);
  }, [heading]);

  useEffect(() => {
    if (destinationBearing !== null && destinationBearing !== undefined) {
      const angle = ((destinationBearing - heading + 360) % 360);
      arrowRotation.value = withSpring(angle, SPRING);
    }
  }, [destinationBearing, heading]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `-${rotation.value}deg` }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  const R = size / 2;
  const innerR = R * 0.85;

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5 * Math.PI) / 180;
    const isMajor = i % 6 === 0;
    const isMid = i % 3 === 0;
    const outerR2 = innerR;
    const innerR2 = isMajor ? innerR * 0.82 : isMid ? innerR * 0.88 : innerR * 0.93;
    return {
      x1: R + outerR2 * Math.sin(angle),
      y1: R - outerR2 * Math.cos(angle),
      x2: R + innerR2 * Math.sin(angle),
      y2: R - innerR2 * Math.cos(angle),
      isMajor,
    };
  });

  const cardinals = [
    { label: 'N', angle: 0, color: '#FF3D00' },
    { label: 'E', angle: 90, color: '#FFFFFF' },
    { label: 'S', angle: 180, color: '#FFFFFF' },
    { label: 'W', angle: 270, color: '#FFFFFF' },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.ring, ringStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={R} cy={R} r={innerR}
            stroke="#2A4A6F" strokeWidth={1.5}
            fill="rgba(11,34,82,0.95)"
          />
          <Circle
            cx={R} cy={R} r={innerR}
            stroke="#4DA6FF" strokeWidth={1.5}
            fill="none"
          />
          {ticks.map((tick, i) => (
            <Line
              key={i}
              x1={tick.x1} y1={tick.y1}
              x2={tick.x2} y2={tick.y2}
              stroke={tick.isMajor ? '#C8A84B' : '#4DA6FF'}
              strokeWidth={tick.isMajor ? 2 : 1}
            />
          ))}
          {cardinals.map((c) => {
            const a = (c.angle * Math.PI) / 180;
            const lr = innerR * 0.7;
            return (
              <SvgText
                key={c.label}
                x={R + lr * Math.sin(a)}
                y={R - lr * Math.cos(a)}
                fill={c.color}
                fontSize={c.label === 'N' ? 22 : 18}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {c.label}
              </SvgText>
            );
          })}
          {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
            const a = (deg * Math.PI) / 180;
            const lr = innerR * 0.7;
            return (
              <SvgText
                key={deg}
                x={R + lr * Math.sin(a)}
                y={R - lr * Math.cos(a)}
                fill="#7A9BBE"
                fontSize={11}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {deg}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.arrowContainer, arrowStyle]}>
        <Svg width={size} height={size}>
          <G>
            <Polygon
              points={`${R},${R - innerR * 0.55} ${R - 14},${R + innerR * 0.1} ${R + 14},${R + innerR * 0.1}`}
              fill={destinationBearing !== null && destinationBearing !== undefined ? '#00E676' : '#4DA6FF'}
            />
            <Polygon
              points={`${R},${R + innerR * 0.55} ${R - 14},${R - innerR * 0.1} ${R + 14},${R - innerR * 0.1}`}
              fill="#FF3D00"
            />
            <Circle cx={R} cy={R} r={10} fill="#132A47" stroke="#4DA6FF" strokeWidth={2} />
          </G>
        </Svg>
      </Animated.View>

      <View style={styles.headingBadge}>
        <Text style={[styles.headingText, { color: colors.primary }]}>
          {Math.round(heading).toString().padStart(3, '0')}°
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: 0, left: 0,
  },
  arrowContainer: {
    position: 'absolute',
    top: 0, left: 0,
  },
  headingBadge: {
    position: 'absolute',
    bottom: -4,
  },
  headingText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
});
