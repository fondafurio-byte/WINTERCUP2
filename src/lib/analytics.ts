import { supabase } from './supabase'

export type EventType = 'app_open' | 'login' | 'logout' | 'access_page' | 'action'

/**
 * Log an event to the analytics table
 * @param eventType Type of event (app_open, login, logout, access_page, action)
 * @param userCategory User category (squadra, pubblico, rilevatore, admin)
 * @param eventData Additional event metadata
 */
export async function logEvent(
  eventType: EventType,
  userCategory?: string,
  eventData?: Record<string, any>
) {
  try {
    // Don't block the UI - run async in background
    supabase.rpc('log_event', {
      p_event_type: eventType,
      p_user_category: userCategory || null,
      p_event_data: eventData || null
    }).catch(err => {
      // Silently fail - analytics shouldn't break the app
      console.debug('Analytics event logging failed:', err)
    })
  } catch (err) {
    console.debug('Analytics error:', err)
  }
}

/**
 * Determine user category based on auth and database checks
 * @returns User category string or null
 */
export async function getUserCategory(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (adminData && adminData.length > 0) return 'admin'

    // Check rilevatore
    const { data: rilevData } = await supabase
      .from('rilevatori')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (rilevData && rilevData.length > 0) return 'rilevatore'

    // Check team user
    const { data: teamData } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (teamData && teamData.length > 0) return 'squadra'

    // Check public user
    const { data: pubData } = await supabase
      .from('public_users')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (pubData && pubData.length > 0) return 'pubblico'

    return null
  } catch (err) {
    console.debug('Error determining user category:', err)
    return null
  }
}

/**
 * Get event statistics for admin dashboard
 * @returns Object with counts by event type and category
 */
export async function getEventStats() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('event_type, user_category')

    if (error || !data) {
      console.error('Error fetching event stats:', error)
      return null
    }

    const stats = {
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      total: data.length
    }

    data.forEach((event: any) => {
      if (event.event_type) {
        stats.byType[event.event_type] = (stats.byType[event.event_type] || 0) + 1
      }
      if (event.user_category) {
        stats.byCategory[event.user_category] = (stats.byCategory[event.user_category] || 0) + 1
      }
    })

    return stats
  } catch (err) {
    console.error('Error getting event stats:', err)
    return null
  }
}

/**
 * Log app open event (call from App.tsx or main layout)
 */
export async function logAppOpen() {
  const category = await getUserCategory()
  logEvent('app_open', category || 'anonimo')
}

/**
 * Log page access (call from page components)
 */
export async function logPageAccess(pageName: string) {
  const category = await getUserCategory()
  logEvent('access_page', category || 'anonimo', { page: pageName })
}

/**
 * Log user action (call from event handlers)
 */
export async function logAction(actionName: string, metadata?: Record<string, any>) {
  const category = await getUserCategory()
  logEvent('action', category || 'anonimo', { action: actionName, ...metadata })
}
