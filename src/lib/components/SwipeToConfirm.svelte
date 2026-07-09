<script lang="ts">
	let {
		onConfirm = () => {},
		disabled = false,
		isLoading = false,
		text = 'Geser untuk Konfirmasi Presensi →'
	}: {
		onConfirm?: () => void;
		disabled?: boolean;
		isLoading?: boolean;
		text?: string;
	} = $props();

	let containerEl: HTMLDivElement | null = $state(null);
	let thumbEl: HTMLDivElement | null = $state(null);

	let isDragging = $state(false);
	let dragX = $state(0);
	let isConfirmed = $state(false);
	let startX = 0;

	function handlePointerDown(e: PointerEvent) {
		if (disabled || isLoading || isConfirmed) return;
		isDragging = true;
		startX = e.clientX - dragX;
		if (thumbEl) {
			thumbEl.setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || !containerEl || !thumbEl) return;
		const maxDrag = Math.max(0, containerEl.clientWidth - thumbEl.clientWidth - 8);
		let currentX = e.clientX - startX;
		currentX = Math.max(0, Math.min(maxDrag, currentX));
		dragX = currentX;

		if (maxDrag > 0 && currentX >= maxDrag * 0.92) {
			isDragging = false;
			dragX = maxDrag;
			isConfirmed = true;
			onConfirm();
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging || !containerEl || !thumbEl) return;
		isDragging = false;
		if (thumbEl) {
			thumbEl.releasePointerCapture(e.pointerId);
		}

		const maxDrag = Math.max(0, containerEl.clientWidth - thumbEl.clientWidth - 8);
		if (maxDrag > 0 && dragX >= maxDrag * 0.92) {
			dragX = maxDrag;
			isConfirmed = true;
			onConfirm();
		} else {
			dragX = 0;
		}
	}

	$effect(() => {
		if (!isLoading && !isConfirmed) {
			dragX = 0;
		}
	});
</script>

<div
	bind:this={containerEl}
	class="relative flex h-14 w-full select-none items-center overflow-hidden rounded-full border border-blue-200 dark:border-blue-800 bg-[#EFF6FF] dark:bg-blue-950/70 p-1 shadow-inner"
>
	<div
		class="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] transition-all {isDragging ? 'duration-75' : 'duration-300'}"
		style="width: {thumbEl ? dragX + thumbEl.clientWidth : 0}px; opacity: {isConfirmed || dragX > 10 ? 0.95 : 0};"
	></div>

	<div class="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center text-xs font-semibold tracking-wide transition-opacity duration-200 {dragX > 40 ? 'text-white' : 'text-[#2563EB] dark:text-blue-300'}">
		{#if isLoading}
			<div class="flex items-center gap-2 text-white">
				<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
				<span>Mengirim Presensi...</span>
			</div>
		{:else if isConfirmed}
			<span class="text-white font-bold">Terverifikasi!</span>
		{:else}
			<span>{text}</span>
		{/if}
	</div>

	<div
		role="slider"
		tabindex="0"
		aria-label="Geser untuk konfirmasi presensi"
		aria-valuenow={dragX}
		aria-valuemin={0}
		aria-valuemax={100}
		bind:this={thumbEl}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		style="transform: translate3d({dragX}px, 0, 0);"
		class="relative z-10 flex h-12 w-12 shrink-0 cursor-grab items-center justify-center rounded-full bg-[#2563EB] text-white shadow-md transition-transform active:cursor-grabbing {isDragging ? 'duration-0 scale-95' : 'duration-300'} {disabled || isLoading ? 'pointer-events-none opacity-60' : ''}"
	>
		{#if isLoading}
			<span class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
		{:else if isConfirmed}
			<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
				<polyline points="20 6 9 17 4 12"/>
			</svg>
		{:else}
			<svg class="h-6 w-6 transition-transform {isDragging ? 'translate-x-0.5' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<polyline points="9 18 15 12 9 6"/>
			</svg>
		{/if}
	</div>
</div>
