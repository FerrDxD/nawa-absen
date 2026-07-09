<script lang="ts">
	import { onMount } from 'svelte';

	let isDark = $state(false);

	function toggleTheme() {
		if (typeof document === 'undefined') return;
		isDark = !isDark;
		const root = document.documentElement;
		if (isDark) {
			root.classList.add('dark');
			root.classList.remove('light');
			try {
				localStorage.setItem('nawa-absen-theme', 'dark');
			} catch (e) {}
		} else {
			root.classList.add('light');
			root.classList.remove('dark');
			try {
				localStorage.setItem('nawa-absen-theme', 'light');
			} catch (e) {}
		}
	}

	onMount(() => {
		if (typeof document !== 'undefined') {
			isDark = document.documentElement.classList.contains('dark');
		}
	});
</script>

<header class="sticky top-0 z-50 border-b border-[#E5E7EB] dark:border-slate-800 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md">
	<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
		<!-- Kiri: Logo + NAWA-ABSEN + Tag MPLS 2026 -->
		<a href="/" class="flex items-center gap-2.5">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
					<path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
					<polyline points="9 12 11 14 15 10"/>
				</svg>
			</div>
			<div class="flex items-center gap-2">
				<span class="font-heading text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
					NAWA-ABSEN
				</span>
				<span class="rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB] dark:text-blue-300 border border-blue-100 dark:border-blue-800">
					MPLS 2026
				</span>
			</div>
		</a>

		<!-- Kanan: Status Online + Dark Mode Toggle -->
		<div class="flex items-center gap-2.5">
			<div class="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-xs font-semibold text-[#10B981]">
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
				</span>
				<span>Online</span>
			</div>

			<button
				type="button"
				onclick={toggleTheme}
				aria-label="Ganti tema tampilan"
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
			>
				{#if isDark}
					<svg class="h-4.5 w-4.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
						<circle cx="12" cy="12" r="4"/>
						<path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
					</svg>
				{:else}
					<svg class="h-4.5 w-4.5 text-[#0F172A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
						<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
					</svg>
				{/if}
			</button>
		</div>
	</div>
</header>
