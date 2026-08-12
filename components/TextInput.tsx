import { TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { FONT_REGULAR, BASE_FONT_SIZE } from '../theme/typography';

export default function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput style={[{ fontFamily: FONT_REGULAR, fontSize: BASE_FONT_SIZE }, style]} {...rest} />;
}
