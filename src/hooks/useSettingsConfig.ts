import { useState, useEffect, useCallback } from 'react'
import { DatabaseService } from '@core/utils/DatabaseService'

export function useSettingsConfig(configKeys: string[]) {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (loaded) return
    Promise.all(configKeys.map(k => DatabaseService.getConfig(k).then(v => ({ key: k, value: v || '' }))))
      .then((entries) => {
        const map: Record<string, string> = {}
        entries.forEach(e => { map[e.key] = e.value })
        setConfig(map)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [loaded, configKeys])

  const save = useCallback(async () => {
    setIsSaving(true)
    await Promise.all(
      Object.entries(config).map(([key, value]) =>
        DatabaseService.setConfig(key, value)
      )
    )
    await new Promise((r) => setTimeout(r, 200))
    setIsSaving(false)
  }, [config])

  return { config, setConfig, loaded, isSaving, save }
}
