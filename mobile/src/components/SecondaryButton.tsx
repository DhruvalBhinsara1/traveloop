import React from 'react';

import { AppButtonProps, ButtonBase } from './ButtonBase';

export function SecondaryButton(props: AppButtonProps) {
  return <ButtonBase {...props} tone="secondary" />;
}
