import OriginalComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import type {Props} from '@theme/NavbarItem';
import type {ComponentType} from 'react';
import RuntimeStatusNavbarItem from '@site/src/theme/NavbarItem/RuntimeStatus';

type NavbarComponentTypes = Record<string, ComponentType<Props>>;

const componentTypes: NavbarComponentTypes = {
  ...(OriginalComponentTypes as NavbarComponentTypes),
  'custom-jackRuntime': RuntimeStatusNavbarItem as ComponentType<Props>,
};

export default componentTypes;
