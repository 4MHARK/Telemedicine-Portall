import { describe, expect, it } from 'vitest'

import { stripBasePath } from './base-path'

describe('stripBasePath', () => {
  it('leaves paths alone at the domain root', () => {
    expect(stripBasePath('/documents', '')).toBe('/documents')
    expect(stripBasePath('/', '')).toBe('/')
  })

  it('removes a deployment base', () => {
    expect(stripBasePath('/portal/documents', '/portal')).toBe('/documents')
    expect(stripBasePath('/portal', '/portal')).toBe('/')
  })

  it('does not strip a prefix that is not the base', () => {
    expect(stripBasePath('/portalx/documents', '/portal')).toBe('/portalx/documents')
    expect(stripBasePath('/documents', '/portal')).toBe('/documents')
  })
})
