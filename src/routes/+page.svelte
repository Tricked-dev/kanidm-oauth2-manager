<script lang="ts">
	import Oauth2Manager from '$lib/components/Oauth2Manager.svelte';
	import GroupManager from '$lib/components/GroupManager.svelte';
	import UserManager from '$lib/components/UserManager.svelte';
	import Toaster from '$lib/components/Toaster.svelte';

	const { data } = $props();

	let activeTab = $state<'oauth2' | 'groups' | 'users'>('oauth2');
	let notifications = $state<
		Array<{ id: string; type: 'success' | 'error' | 'info'; message: string; timeout?: number }>
	>([]);

	function addNotification(type: 'success' | 'error' | 'info', message: string, timeout = 5000) {
		const id = Math.random().toString(36).substr(2, 9);
		notifications.push({ id, type, message, timeout });

		if (timeout > 0) {
			setTimeout(() => {
				notifications = notifications.filter((n) => n.id !== id);
			}, timeout);
		}
	}

	function removeNotification(id: string) {
		notifications = notifications.filter((n) => n.id !== id);
	}
</script>

<svelte:head>
	<title>Kanidm Management Console</title>
	<meta name="description" content="Manage OAuth2 applications, groups, and users in Kanidm" />
</svelte:head>

<Toaster {notifications} {removeNotification} />

<div class="bg-base-100 min-h-screen">
	<!-- Header -->
	<div class="navbar bg-base-200 shadow-sm">
		<div class="navbar-start">
			<h1 class="text-xl font-bold">Kanidm Management Console</h1>
		</div>
		<div class="navbar-end">
			<a href={data.home} class="btn btn-ghost btn-sm">Back to Kanidm</a>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="bg-base-200/50 border-base-300 border-b">
		<div class="container mx-auto px-4">
			<div class="tabs tabs-bordered">
				<button
					class="tab tab-lg {activeTab === 'oauth2' ? 'tab-active' : ''}"
					onclick={() => (activeTab = 'oauth2')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					OAuth2 Applications
					{#if data.apps?.body?.length}
						<span class="badge badge-neutral badge-sm ml-2">{data.apps.body.length}</span>
					{/if}
				</button>
				<button
					class="tab tab-lg {activeTab === 'groups' ? 'tab-active' : ''}"
					onclick={() => (activeTab = 'groups')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Groups
					{#if data.groups?.body?.length}
						<span class="badge badge-neutral badge-sm ml-2">{data.groups.body.length}</span>
					{/if}
				</button>
				<button
					class="tab tab-lg {activeTab === 'users' ? 'tab-active' : ''}"
					onclick={() => (activeTab = 'users')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
						/>
					</svg>
					Users
					{#if data.users?.body?.length}
						<span class="badge badge-neutral badge-sm ml-2">{data.users.body.length}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Tab Content -->
	<main class="flex-1">
		{#if activeTab === 'oauth2'}
			<Oauth2Manager {data} {addNotification} />
		{:else if activeTab === 'groups'}
			<GroupManager {data} {addNotification} />
		{:else if activeTab === 'users'}
			<UserManager {data} {addNotification} />
		{/if}
	</main>
</div>
