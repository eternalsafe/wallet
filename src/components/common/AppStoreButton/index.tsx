import type { ReactElement } from 'react'
import Image from 'next/image'

import { useDarkMode } from '@/hooks/useDarkMode'

// App Store campaigns track the user interaction
enum LINKS {
  footer = 'https://apps.apple.com/app/apple-store/id1515759131?pt=119497694&ct=Web%20App%20Footer&mt=8',
}

const AppstoreButton = ({ placement }: { placement: keyof typeof LINKS }): ReactElement => {
  const isDarkMode = useDarkMode()

  return (
    <a href={LINKS[placement]} target="_blank" rel="noreferrer">
      <Image
        src={isDarkMode ? '/images/common/appstore-light.svg' : '/images/common/appstore.svg'}
        alt="Download on the App Store"
        width={105}
        height={35}
      />
    </a>
  )
}

export default AppstoreButton
