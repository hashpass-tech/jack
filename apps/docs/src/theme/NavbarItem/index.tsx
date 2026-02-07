import type {ReactNode} from 'react';
import OriginalNavbarItem from '@theme-original/NavbarItem';
import RuntimeStatusNavbarItem from '@site/src/theme/NavbarItem/RuntimeStatus';

type NavbarItemProps = {
  type?: string;
  mobile?: boolean;
  className?: string;
  [key: string]: unknown;
};

export default function NavbarItem(props: NavbarItemProps): ReactNode {
  if (props.type === 'custom-jackRuntime') {
    return (
      <RuntimeStatusNavbarItem
        mobile={props.mobile}
        className={props.className}
      />
    );
  }
  return <OriginalNavbarItem {...props} />;
}
