<script lang="ts">
	import { enhance } from '$app/forms'
	import type { PageServerData } from './$types'

	let { data }: { data: PageServerData } = $props()
</script>

<h1>Hi, {data.user.username}!</h1>
<p>Your user ID is {data.user.id}.</p>
<code><pre>{JSON.stringify(data, null, 2)}</pre></code>
<hr />
<form method="post" action="?/logout" use:enhance>
	<button>Sign out</button>
</form>
