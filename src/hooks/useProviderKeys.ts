import { useState, useEffect, useCallback } from 'react'
import { getAllProviders } from '@core/providers/providerRegistry'
import { DatabaseService } from '@core/utils/DatabaseService'

export async function saveProviderKeys(
  providers: { id: string; configKey: string }[],
  keys: Record<string, string>,
  useAllSettled?: boolean
): Promise<void> {
  const fn = useAllSettled ? Promise.allSettled : Promise.all
  await fn(providers.map(p => DatabaseService.setConfig(p.configKey, keys[p.id])))
  providers.forEach(p => {
    localStorage.setItem(p.configKey, keys[p.id])
  })
}

interface ExtraConfig {
  key: string
  storageKey?: string
}

export function useProviderKeys(extraConfigs?: ExtraConfig[]) {
  const providers = getAllProviders()

  const [keys, setKeys] = useState<Record<string, string>>(
    Object.fromEntries(providers.map(p => [p.id, '']))
  )
  const [extras, setExtras] = useState<Record<string, string>>({})

  useEffect(() => {
    (async () => {
      const initial: Record<string, string> = {}
      for (const p of providers) {
        initial[p.id] = await DatabaseService.getConfig(p.configKey)
          .then(r => r || localStorage.getItem(p.configKey) || '')
      }
      setKeys(initial)

      if (extraConfigs) {
        const extraInit: Record<string, string> = {}
        for (const ec of extraConfigs) {
          extraInit[ec.key] = await DatabaseService.getConfig(ec.key)
            .then(r => r || (ec.storageKey ? localStorage.getItem(ec.storageKey) : '') || '')
        }
        setExtras(extraInit)
      }
    })()
  }, [providers, extraConfigs])

  const setExtraValue = useCallback((key: string, value: string) => {
    setExtras(prev => ({ ...prev, [key]: value }))
  }, [])

  const saveAll = useCallback(async (useAllSettled?: boolean) => {
    await saveProviderKeys(providers, keys, useAllSettled)

    if (extraConfigs) {
      for (const ec of extraConfigs) {
        await DatabaseService.setConfig(ec.key, extras[ec.key] || '').catch(() => {})
        if (ec.storageKey) {
          localStorage.setItem(ec.storageKey, extras[ec.key] || '')
        }
      }
    }
  }, [providers, keys, extras, extraConfigs])

  return { providers, keys, setKeys, extras, setExtraValue, saveAll }
}
