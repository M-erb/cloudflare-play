import type { Handle } from '@sveltejs/kit'
import * as auth from '$lib/server/auth'
import { env } from '$env/dynamic/private'
import { getDb } from '$lib/server/db'

const handleAuth: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL)
	const sessionToken = event.cookies.get(auth.sessionCookieName)

	console.log('event.platform?.env?.DB', event.platform?.env?.DB)

	if (!sessionToken) {
		event.locals.user = null
		event.locals.session = null
		return resolve(event)
	}

	const { session, user } = await auth.validateSessionToken(sessionToken, event.locals.db)

	if (session) {
		auth.setSessionTokenCookie(event.cookies, sessionToken, session.expiresAt)
	} else {
		auth.deleteSessionTokenCookie(event.cookies)
	}

	event.locals.user = user
	event.locals.session = session
	return resolve(event)
}

export const handle: Handle = handleAuth
