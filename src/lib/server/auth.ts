import type { RequestEvent } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding'
// import { db } from '$lib/server/db'
import * as table from '$lib/server/db/schema'
import type { DrizzleClient } from '$lib/server/db'

const DAY_IN_MS = 1000 * 60 * 60 * 24

export const sessionCookieName = 'auth-session'

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18))
	const token = encodeBase64url(bytes)
	return token
}

export async function createSession(token: string, userId: string, db: DrizzleClient) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
	const session: typeof table.session.$inferSelect = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	}
	await db.insert(table.session).values(session)
	return session
}

export async function validateSessionToken(token: string, db: DrizzleClient) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

	const result = await db.query.session.findFirst({
		where: eq(table.session.id, sessionId),
		with: {
			user: true
		}
	})

	if (!result) {
		return { session: null, user: null }
	}

	const user = result.user
	const session: {
		id: string
		userId: string
		expiresAt: Date
		user?: { id: string; username: string }
	} = result

	if (session.user) delete session.user

	const sessionExpired = Date.now() >= session.expiresAt.getTime()
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id))
		return { session: null, user: null }
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30)
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id))
	}

	return { session, user }
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>

export async function invalidateSession(sessionId: string, db: DrizzleClient) {
	await db.delete(table.session).where(eq(table.session.id, sessionId))
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	})
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	})
}
