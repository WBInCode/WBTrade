import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Controller, Control } from 'react-hook-form';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

interface InputProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  error?: string;
  // react-hook-form integration
  control?: Control<any>;
  name?: string;
  rules?: any;
}

export default function Input({
  label,
  error,
  control,
  name,
  rules,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  const renderInput = (
    value?: string,
    onChange?: (text: string) => void,
    onBlur?: () => void,
    fieldError?: string,
  ) => {
    const displayError = fieldError || error;

    return (
      <View style={{ marginBottom: 16 }}>
        {label && (
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: Colors.secondary[700],
              marginBottom: 6,
            }}
          >
            {label}
          </Text>
        )}
        <View style={{ position: 'relative' }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={isPassword && !showPassword}
            placeholderTextColor={Colors.secondary[400]}
            style={[
              {
                borderWidth: 1,
                borderColor: displayError ? Colors.destructive : Colors.border,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 14,
                paddingRight: isPassword ? 44 : 14,
                fontSize: 15,
                color: Colors.secondary[900],
                backgroundColor: Colors.white,
              },
            ]}
            {...rest}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
            >
              <FontAwesome
                name={showPassword ? 'eye-slash' : 'eye'}
                size={18}
                color={Colors.secondary[400]}
              />
            </TouchableOpacity>
          )}
        </View>
        {displayError && (
          <Text
            style={{
              fontSize: 12,
              color: Colors.destructive,
              marginTop: 4,
            }}
          >
            {displayError}
          </Text>
        )}
      </View>
    );
  };

  // With react-hook-form
  if (control && name) {
    return (
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) =>
          renderInput(value, onChange, onBlur, fieldError?.message)
        }
      />
    );
  }

  // Standalone
  return renderInput(rest.value as string, rest.onChangeText);
}
