import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'home' | 'book' | 'plus' | 'calendar' | 'cart' | 'search' | 'bell'
  | 'gear' | 'user' | 'heart' | 'star' | 'clock' | 'flame' | 'share'
  | 'more' | 'moreV' | 'back' | 'fwd' | 'down' | 'up' | 'x' | 'check'
  | 'minus' | 'camera' | 'link' | 'sparkle' | 'filter' | 'grid' | 'list'
  | 'trash' | 'pencil' | 'timer' | 'mic' | 'volume' | 'pause' | 'play'
  | 'drag' | 'leaf' | 'bookmark' | 'people' | 'fridge' | 'lock' | 'apple'
  | 'google' | 'scale' | 'chefhat' | 'bolt' | 'download' | 'globe' | 'info'
  | 'wifi' | 'sun' | 'plate' | 'receipt' | 'eyeoff' | 'refresh' | 'cloud'
  | 'tag' | 'note' | 'arrowR' | 'access' | 'ear' | 'soundwave' | 'textsize'
  | 'contrast' | 'captions' | 'carrot' | 'handtap';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: object;
}

const S = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function StrokeIcon({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export default function Icon({ name, size = 24, color = 'currentColor', style }: Props) {
  const c = color;
  const s = size;

  switch (name) {
    case 'home':
      return <StrokeIcon size={s} color={c}><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></StrokeIcon>;
    case 'book':
      return <StrokeIcon size={s} color={c}><Path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 20.5z" /><Path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H20" /></StrokeIcon>;
    case 'plus':
      return <StrokeIcon size={s} color={c}><Path d="M12 5v14M5 12h14" /></StrokeIcon>;
    case 'calendar':
      return <StrokeIcon size={s} color={c}><Rect x={3.5} y={4.5} width={17} height={16} rx={2.5} /><Path d="M3.5 9h17M8 3v4M16 3v4" /></StrokeIcon>;
    case 'cart':
      return <StrokeIcon size={s} color={c}><Circle cx={9.5} cy={20} r={1.4} /><Circle cx={18} cy={20} r={1.4} /><Path d="M2.5 3.5h2.2l2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.47-1.16L21 7.5H6" /></StrokeIcon>;
    case 'search':
      return <StrokeIcon size={s} color={c}><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.2-3.2" /></StrokeIcon>;
    case 'bell':
      return <StrokeIcon size={s} color={c}><Path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" /><Path d="M10 20a2.2 2.2 0 0 0 4 0" /></StrokeIcon>;
    case 'gear':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={3.2} /><Path d="M19.4 12a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2-1.2L14.4 2h-4l-.4 2.6a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.3 7.3 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2" /></StrokeIcon>;
    case 'user':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={8.5} r={4} /><Path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></StrokeIcon>;
    case 'heart':
      return <StrokeIcon size={s} color={c}><Path d="M12 20.5S3.5 15 3.5 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.5 2.8C20.5 15 12 20.5 12 20.5" /></StrokeIcon>;
    case 'star':
      return <StrokeIcon size={s} color={c}><Path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" /></StrokeIcon>;
    case 'clock':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={8.5} /><Path d="M12 7.5V12l3 2" /></StrokeIcon>;
    case 'flame':
      return <StrokeIcon size={s} color={c}><Path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.8-3 1.5-3.8C8.5 9.7 9 11 10 11c0-2.5 2-5 2-8" /></StrokeIcon>;
    case 'share':
      return <StrokeIcon size={s} color={c}><Circle cx={6.5} cy={12} r={2.2} /><Circle cx={17.5} cy={6} r={2.2} /><Circle cx={17.5} cy={18} r={2.2} /><Path d="m8.5 11 7-3.8M8.5 13l7 3.8" /></StrokeIcon>;
    case 'more':
      return <StrokeIcon size={s} color={c}><Circle cx={5.5} cy={12} r={1.4} /><Circle cx={12} cy={12} r={1.4} /><Circle cx={18.5} cy={12} r={1.4} /></StrokeIcon>;
    case 'moreV':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={5.5} r={1.4} /><Circle cx={12} cy={12} r={1.4} /><Circle cx={12} cy={18.5} r={1.4} /></StrokeIcon>;
    case 'back':
      return <StrokeIcon size={s} color={c}><Path d="M15 5l-7 7 7 7" /></StrokeIcon>;
    case 'fwd':
      return <StrokeIcon size={s} color={c}><Path d="M9 5l7 7-7 7" /></StrokeIcon>;
    case 'down':
      return <StrokeIcon size={s} color={c}><Path d="M5 9l7 7 7-7" /></StrokeIcon>;
    case 'up':
      return <StrokeIcon size={s} color={c}><Path d="M5 15l7-7 7 7" /></StrokeIcon>;
    case 'x':
      return <StrokeIcon size={s} color={c}><Path d="M6 6l12 12M18 6 6 18" /></StrokeIcon>;
    case 'check':
      return <StrokeIcon size={s} color={c}><Path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></StrokeIcon>;
    case 'minus':
      return <StrokeIcon size={s} color={c}><Path d="M5 12h14" /></StrokeIcon>;
    case 'camera':
      return <StrokeIcon size={s} color={c}><Path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2L9 4.5h6L16.5 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><Circle cx={12} cy={13} r={3.5} /></StrokeIcon>;
    case 'link':
      return <StrokeIcon size={s} color={c}><Path d="M9.5 14.5a4 4 0 0 1 0-5.6l3-3a4 4 0 0 1 5.6 5.6l-1.6 1.6" /><Path d="M14.5 9.5a4 4 0 0 1 0 5.6l-3 3a4 4 0 0 1-5.6-5.6l1.6-1.6" /></StrokeIcon>;
    case 'sparkle':
      return <StrokeIcon size={s} color={c}><Path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><Path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></StrokeIcon>;
    case 'filter':
      return <StrokeIcon size={s} color={c}><Path d="M3.5 6h17M6.5 12h11M10 18h4" /></StrokeIcon>;
    case 'grid':
      return <StrokeIcon size={s} color={c}><Rect x={3.5} y={3.5} width={7} height={7} rx={1.5} /><Rect x={13.5} y={3.5} width={7} height={7} rx={1.5} /><Rect x={3.5} y={13.5} width={7} height={7} rx={1.5} /><Rect x={13.5} y={13.5} width={7} height={7} rx={1.5} /></StrokeIcon>;
    case 'list':
      return <StrokeIcon size={s} color={c}><Path d="M8 6.5h12M8 12h12M8 17.5h12" /><Circle cx={4} cy={6.5} r={1.2} /><Circle cx={4} cy={12} r={1.2} /><Circle cx={4} cy={17.5} r={1.2} /></StrokeIcon>;
    case 'trash':
      return <StrokeIcon size={s} color={c}><Path d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12" /></StrokeIcon>;
    case 'pencil':
      return <StrokeIcon size={s} color={c}><Path d="M14.5 5.5l4 4M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19z" /></StrokeIcon>;
    case 'timer':
      return <StrokeIcon size={s} color={c}><Path d="M9 2.5h6M12 7v0" /><Circle cx={12} cy={13.5} r={7.5} /><Path d="M12 9.5v4l2.5 1.8M18.5 7l1.5-1.5" /></StrokeIcon>;
    case 'mic':
      return <StrokeIcon size={s} color={c}><Rect x={9} y={3} width={6} height={11} rx={3} /><Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></StrokeIcon>;
    case 'volume':
      return <StrokeIcon size={s} color={c}><Path d="M4 9.5v5h3l4.5 3.5v-12L7 9.5z" /><Path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" /></StrokeIcon>;
    case 'pause':
      return <StrokeIcon size={s} color={c}><Rect x={6.5} y={5} width={3.5} height={14} rx={1} /><Rect x={14} y={5} width={3.5} height={14} rx={1} /></StrokeIcon>;
    case 'play':
      return <StrokeIcon size={s} color={c}><Path d="M7 4.5l13 7.5-13 7.5z" /></StrokeIcon>;
    case 'drag':
      return <StrokeIcon size={s} color={c}><Circle cx={9} cy={6} r={1.3} /><Circle cx={15} cy={6} r={1.3} /><Circle cx={9} cy={12} r={1.3} /><Circle cx={15} cy={12} r={1.3} /><Circle cx={9} cy={18} r={1.3} /><Circle cx={15} cy={18} r={1.3} /></StrokeIcon>;
    case 'leaf':
      return <StrokeIcon size={s} color={c}><Path d="M20 4S5 3 5 14a5 5 0 0 0 9 3c4-4 6-13 6-13" /><Path d="M5 19C8 12 13 8.5 17 7" /></StrokeIcon>;
    case 'bookmark':
      return <StrokeIcon size={s} color={c}><Path d="M6 4.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V5.5a1 1 0 0 1 1-1" /></StrokeIcon>;
    case 'people':
      return <StrokeIcon size={s} color={c}><Circle cx={8.5} cy={8.5} r={3.2} /><Path d="M2.5 19a6 6 0 0 1 12 0" /><Path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M18 19a6 6 0 0 0-3-5.2" /></StrokeIcon>;
    case 'fridge':
      return <StrokeIcon size={s} color={c}><Rect x={6} y={2.5} width={12} height={19} rx={2.5} /><Path d="M6 10h12M9.5 6v1.5M9.5 13v3" /></StrokeIcon>;
    case 'lock':
      return <StrokeIcon size={s} color={c}><Rect x={5} y={10.5} width={14} height={10} rx={2.5} /><Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></StrokeIcon>;
    case 'scale':
      return <StrokeIcon size={s} color={c}><Path d="M12 3v3M5 6h14l-2.5 2H7.5z" /><Circle cx={12} cy={14.5} r={6} /><Path d="M9.5 14.5h5" /></StrokeIcon>;
    case 'chefhat':
      return <StrokeIcon size={s} color={c}><Path d="M6 13.5a4 4 0 0 1-1-7.9A4.2 4.2 0 0 1 12 4a4.2 4.2 0 0 1 7 1.6 4 4 0 0 1-1 7.9z" /><Path d="M6.5 13.5V19a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-5.5" /></StrokeIcon>;
    case 'bolt':
      return <StrokeIcon size={s} color={c}><Path d="M13 3 5 13h6l-1 8 8-10h-6z" /></StrokeIcon>;
    case 'download':
      return <StrokeIcon size={s} color={c}><Path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></StrokeIcon>;
    case 'globe':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={8.5} /><Path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" /></StrokeIcon>;
    case 'info':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={8.5} /><Path d="M12 11v5M12 7.6v.2" /></StrokeIcon>;
    case 'wifi':
      return <StrokeIcon size={s} color={c}><Path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9 9 0 0 1 13 0M8.5 16a4.5 4.5 0 0 1 7 0M12 19.5v.2" /></StrokeIcon>;
    case 'sun':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={4} /><Path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" /></StrokeIcon>;
    case 'plate':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={8.5} /><Circle cx={12} cy={12} r={4.5} /></StrokeIcon>;
    case 'receipt':
      return <StrokeIcon size={s} color={c}><Path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2z" /><Path d="M9 8h6M9 12h6" /></StrokeIcon>;
    case 'eyeoff':
      return <StrokeIcon size={s} color={c}><Path d="M4 4l16 16M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M6.5 6.7C4.5 8 3 10 2.5 12c1 2.5 4.5 6 9.5 6 1.7 0 3.2-.4 4.5-1M10 5.3A8 8 0 0 1 12 5c5 0 8.5 3.5 9.5 6a13 13 0 0 1-2 3" /></StrokeIcon>;
    case 'refresh':
      return <StrokeIcon size={s} color={c}><Path d="M20 11.5A8 8 0 1 0 19 16M20 5v6.5h-6.5" /></StrokeIcon>;
    case 'cloud':
      return <StrokeIcon size={s} color={c}><Path d="M7 18.5A4.5 4.5 0 0 1 6.5 9.6 5.5 5.5 0 0 1 17 9a4 4 0 0 1 .5 9.5z" /></StrokeIcon>;
    case 'tag':
      return <StrokeIcon size={s} color={c}><Path d="M3.5 11V4.5A1 1 0 0 1 4.5 3.5H11l9.5 9.5a1.4 1.4 0 0 1 0 2L15 20.5a1.4 1.4 0 0 1-2 0z" /><Circle cx={7.5} cy={7.5} r={1.3} /></StrokeIcon>;
    case 'note':
      return <StrokeIcon size={s} color={c}><Path d="M5 4.5h14v10l-5 5H5z" /><Path d="M19 14.5h-5v5" /><Path d="M8.5 9h7M8.5 12.5h4" /></StrokeIcon>;
    case 'arrowR':
      return <StrokeIcon size={s} color={c}><Path d="M4 12h15M13 6l6 6-6 6" /></StrokeIcon>;
    case 'access':
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={9} /><Circle cx={12} cy={6.9} r={1.35} /><Path d="M6.5 9.4c1.7.8 3.6 1.1 5.5 1.1s3.8-.3 5.5-1.1M12 10.6v4.4l-2.4 4.2M12 15l2.4 4.2" /></StrokeIcon>;
    case 'ear':
      return <StrokeIcon size={s} color={c}><Path d="M7 9.2a5 5 0 0 1 10 0c0 3-2.6 4-3.6 5.4-.8 1-.5 2.3-1.7 3.1a2.7 2.7 0 0 1-4.1-2.3M9.6 9.2a2.4 2.4 0 0 1 4.8 0" /></StrokeIcon>;
    case 'soundwave':
      return <StrokeIcon size={s} color={c}><Path d="M3 12h1.5M7 8.5v7M11 5v14M15 8v8M19 10v4M21.2 11.4v1.2" /></StrokeIcon>;
    case 'textsize':
      return <StrokeIcon size={s} color={c}><Path d="M3 7.2V5.2h8v2M7 5.2v13.6M5.6 18.8h2.8M12.5 10.6V9.2h7v1.4M16 9.2v9.6M14.6 18.8h2.8" /></StrokeIcon>;
    case 'contrast':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={8.5} />
          <Path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill={c} stroke="none" />
        </Svg>
      );
    case 'captions':
      return <StrokeIcon size={s} color={c}><Rect x={3} y={5} width={18} height={14} rx={2.6} /><Path d="M9 10.6a2 2 0 1 0 0 2.8M16 10.6a2 2 0 1 0 0 2.8" /></StrokeIcon>;
    case 'handtap':
      return <StrokeIcon size={s} color={c}><Path d="M9 11V5.5a1.6 1.6 0 0 1 3.2 0V11M12.2 11V7.4a1.6 1.6 0 0 1 3.2 0V12M15.4 12v-1.4a1.6 1.6 0 0 1 3.2 0V15a5 5 0 0 1-5 5h-1.6a4.5 4.5 0 0 1-3.3-1.5l-3-3.3a1.6 1.6 0 0 1 2.4-2.1L9 12.6V11" /></StrokeIcon>;
    case 'apple':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M16.2 12.7c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.15-2.9.9-3.6.9-.75 0-1.9-.85-3.1-.85-1.6 0-3.05.93-3.87 2.36-1.65 2.87-.42 7.12 1.18 9.45.78 1.14 1.71 2.42 2.93 2.37 1.18-.05 1.62-.76 3.04-.76 1.41 0 1.81.76 3.05.74 1.26-.02 2.06-1.16 2.83-2.31a9.4 9.4 0 0 0 1.28-2.64c-.03-.01-2.45-.94-2.48-3.73M14 5.2c.65-.8 1.09-1.9.97-3-.94.04-2.08.63-2.75 1.42-.6.7-1.13 1.82-.99 2.9 1.05.08 2.12-.53 2.77-1.32" fill={c} stroke="none" />
        </Svg>
      );
    case 'google':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M21 12.2c0-.66-.06-1.3-.17-1.9H12v3.6h5.05a4.3 4.3 0 0 1-1.87 2.82v2.34h3.02C19.97 17.4 21 15 21 12.2" fill="#4285F4" stroke="none" />
          <Path d="M12 21.5c2.52 0 4.63-.83 6.18-2.26l-3.02-2.34c-.84.56-1.9.9-3.16.9-2.43 0-4.5-1.64-5.23-3.85H3.66v2.42A9.5 9.5 0 0 0 12 21.5" fill="#34A853" stroke="none" />
          <Path d="M6.77 13.95a5.7 5.7 0 0 1 0-3.65V7.88H3.66a9.5 9.5 0 0 0 0 8.49z" fill="#FBBC05" stroke="none" />
          <Path d="M12 6.45c1.37 0 2.6.47 3.57 1.4l2.67-2.67A9.5 9.5 0 0 0 12 2.5a9.5 9.5 0 0 0-8.34 5.38l3.11 2.42C7.5 8.09 9.57 6.45 12 6.45" fill="#EA4335" stroke="none" />
        </Svg>
      );
    case 'carrot':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path d="M12.2 8.6 6.1 18.9a1.05 1.05 0 0 1-1.9-.3 1.05 1.05 0 0 1 .05-.45L8.4 8.4a2 2 0 0 1 3.8.2Z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M10.2 8c-.2-1.6.7-3.1 2.3-3.6M12.3 9.2c1.3-1 3.2-.9 4.5.1" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return <StrokeIcon size={s} color={c}><Circle cx={12} cy={12} r={8.5} /><Circle cx={12} cy={12} r={4.5} /></StrokeIcon>;
  }
}
