import {Reference} from '@sanity/types'

import type {ContentfulExport} from '../types'
import {isDraft} from './contentfulEntry'
import type {SysLink} from './objectIsContentfulLink'

type Options = {
  weakRefs?: boolean
}

type ReferenceOrAsset =
  | Reference
  | {
      _type: 'file' | 'image'
      _sanityAsset: string
      title?: string
      description?: string
    }

export function prefixUrl(url: string) {
  return url.startsWith('//') ? `https:${url}` : url
}

export function contentfulLinkToSanityReference(
  id: string,
  link: SysLink,
  locale: string,
  data: ContentfulExport,
  options: Options = {},
): ReferenceOrAsset | null {
  if (link.sys.linkType === 'Asset') {
    const asset = data.assets?.find((item) => item.sys.id === link.sys.id)
    if (asset) {
      const file = asset.fields.file?.[locale]
      if (!file) {
        // eslint-disable-next-line no-console
        console.warn(`Missing file in asset [${asset.sys.id}]`)
        return null
      }

      const type = file.contentType.startsWith('image/') ? 'image' : 'file'

      if (!file.url) {
        // eslint-disable-next-line no-console
        console.warn(`Missing asset url [${asset.sys.id}]`)
        return null
      }

      return {
        _type: type,
        _sanityAsset: `${type}@${prefixUrl(file.url)}`,
        title: asset.fields.title?.[locale],
        description: asset.fields.description?.[locale],
      }
    }

    // eslint-disable-next-line no-console
    console.warn(`Missing asset with ID [${link.sys.id}]`)
    return null
  }

  const linkedEntry = data.entries && data.entries.find((item) => item.sys.id === link.sys.id)

  if (!linkedEntry) {
    // eslint-disable-next-line no-console
    console.warn(`Missing entry with ID [${link.sys.id}]`)
    return null
  }

  if (isDraft(linkedEntry)) {
    if (id.startsWith('drafts.')) {
      // We allow a draft to link to another draft
      const type = linkedEntry.sys.contentType.sys.id
      return {
        _type: 'reference',
        _ref: `drafts.${link.sys.id}`,
        _weak: true,
        _strengthenOnPublish: {
          type: type,
          template: {
            id: type,
            params: {},
          },
        },
      }
    }
    // eslint-disable-next-line no-console
    console.warn(`Link to draft entry with ID [${link.sys.id}]`)
    return null
  }

  return {
    _type: 'reference',
    _ref: link.sys.id,
    _weak: options.weakRefs,
  }
}
