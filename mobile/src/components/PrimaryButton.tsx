import React from 'react';

import { AppButtonProps, ButtonBase } from './ButtonBase';

export function PrimaryButton(props: AppButtonProps) {
  return <ButtonBase {...props} tone="primary" />;
}
