import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const users = await locals.db.query.user.findMany()
	return { users }
}
