import { useMemo } from 'react'

export interface StatConfig<T> {
  key: string
  label: string
  filter: (item: T) => boolean
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  isDefault?: boolean
  icon?: React.ReactNode
}

export function useStats<T>(data: T[], configs: StatConfig<T>[]) {
  return useMemo(() => {
    return configs.map((config) => ({
      ...config,
      count: data.filter(config.filter).length,
    }))
  }, [data, configs])
}
