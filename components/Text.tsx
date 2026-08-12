import { Text as RNText, type TextProps } from 'react-native';
import { FONT_REGULAR, BASE_FONT_SIZE } from '../theme/typography';

export default function Text({ style, ...rest }: TextProps) {
  return <RNText style={[{ fontFamily: FONT_REGULAR, fontSize: BASE_FONT_SIZE }, style]} {...rest} />;
}
