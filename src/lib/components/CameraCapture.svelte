<script lang="ts">
	import { onDestroy, tick } from 'svelte';

	// Deteksi perangkat low-end (RAM ≤2 GB atau CPU core ≤2)
	let isLowEnd = false;
	if (typeof navigator !== 'undefined') {
		const mem = (navigator as any).deviceMemory ?? 4;
		const cores = navigator.hardwareConcurrency ?? 4;
		isLowEnd = mem <= 2 || cores <= 2;
	}

	let {
		autoStart = false,
		onPhotoTaken = (base64: string) => {}
	}: {
		autoStart?: boolean;
		onPhotoTaken: (base64: string) => void;
	} = $props();

	let videoElement: HTMLVideoElement | null = $state(null);
	let canvasElement: HTMLCanvasElement | null = $state(null);
	let analysisCanvas: HTMLCanvasElement | null = null;
	let stream: MediaStream | null = $state(null);

	let isCameraActive = $state(false);
	let isLoadingCamera = $state(false);
	let cameraError = $state<string | null>(null);
	let isPermissionDenied = $state(false);
	let capturedPhotoBase64 = $state<string | null>(null);

	let faceStatus = $state<'searching' | 'detected' | 'capturing'>('searching');
	let autoCaptureCountdown = $state<number | null>(null);
	let faceDetector: any = null;
	let detectInterval: any = null;
	let countdownTimer: any = null;
	let consecutiveFaceFrames = 0;

	// --- 2 Mode Verifikasi Wajah & Timer 10 Detik ---
	let captureMode = $state<'auto' | 'manual'>('auto');
	let showManualPromptModal = $state(false);
	let manualPromptTimer: any = null;

	function startManualPromptTimer() {
		clearManualPromptTimer();
		if (captureMode === 'auto' && !capturedPhotoBase64) {
			manualPromptTimer = setTimeout(() => {
				if (isCameraActive && !capturedPhotoBase64 && captureMode === 'auto') {
					showManualPromptModal = true;
				}
			}, 10000); // 10 detik tanpa deteksi wajah otomatis -> munculkan pop up
		}
	}

	function clearManualPromptTimer() {
		if (manualPromptTimer) {
			clearTimeout(manualPromptTimer);
			manualPromptTimer = null;
		}
	}

	function switchToManualMode() {
		showManualPromptModal = false;
		clearManualPromptTimer();
		captureMode = 'manual';
		stopFaceDetection();
	}

	function switchToAutoMode() {
		showManualPromptModal = false;
		captureMode = 'auto';
		if (isCameraActive && !capturedPhotoBase64 && videoElement) {
			startFaceDetectionLoop();
			startManualPromptTimer();
		}
	}

	function retryAutoMode() {
		showManualPromptModal = false;
		if (isCameraActive && !capturedPhotoBase64 && videoElement) {
			startFaceDetectionLoop();
			startManualPromptTimer();
		}
	}

	async function startCamera() {
		if (isLoadingCamera) return;
		isLoadingCamera = true;
		cameraError = null;
		isPermissionDenied = false;

		stopFaceDetection();
		clearManualPromptTimer();
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}

		try {
			// Resolusi lebih rendah untuk HP low-end (2/32 GB) agar tidak lag
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: isLowEnd ? 320 : 640 },
					height: { ideal: isLowEnd ? 240 : 480 }
				},
				audio: false
			});

			stream = mediaStream;
			isCameraActive = true;

			await tick();
			if (videoElement) {
				videoElement.srcObject = mediaStream;
				await videoElement.play().catch(() => {});
				if (captureMode === 'auto') {
					startFaceDetectionLoop();
					startManualPromptTimer();
				}
			}
		} catch (err: any) {
			console.error('Kamera ditolak atau gagal:', err);
			isCameraActive = false;
			if (
				err.name === 'NotAllowedError' ||
				err.name === 'PermissionDeniedError' ||
				err.message?.includes('Permission denied')
			) {
				isPermissionDenied = true;
				cameraError =
					'Izin kamera ditolak oleh browser Anda. Mohon aktifkan izin akses kamera pada browser.';
			} else {
				cameraError = `Gagal mengaktifkan kamera depan: ${err.message || 'Kesalahan sistem'}.`;
			}
		} finally {
			isLoadingCamera = false;
		}
	}

	function stopCamera() {
		stopFaceDetection();
		clearManualPromptTimer();
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		isCameraActive = false;
	}

	async function detectFaceReal(video: HTMLVideoElement): Promise<boolean> {
		if (video.readyState < 2) return false;

		if (faceDetector) {
			try {
				const faces = await faceDetector.detect(video);
				if (faces && faces.length > 0) {
					const face = faces[0].boundingBox;
					const vidW = video.videoWidth || (isLowEnd ? 320 : 640);
					const vidH = video.videoHeight || (isLowEnd ? 240 : 480);
					const centerX = face.x + face.width / 2;
					const centerY = face.y + face.height / 2;
					const isCentered =
						centerX > vidW * 0.2 &&
						centerX < vidW * 0.8 &&
						centerY > vidH * 0.15 &&
						centerY < vidH * 0.85;
					const ratioW = face.width / vidW;
					return isCentered && ratioW >= 0.18 && ratioW <= 0.85;
				}
				return false;
			} catch (e) {}
		}

		if (typeof document === 'undefined') return false;
		if (!analysisCanvas) {
			analysisCanvas = document.createElement('canvas');
			// Canvas analisis kecil — efisien untuk HP low-end
			analysisCanvas.width = 160;
			analysisCanvas.height = 120;
		}

		const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return false;

		ctx.drawImage(video, 0, 0, 160, 120);

		const imgData = ctx.getImageData(45, 20, 70, 80);
		const data = imgData.data;
		const totalPixels = data.length / 4;

		let skinPixels = 0;
		let lumaSum = 0;
		const lumas: number[] = [];

		for (let i = 0; i < data.length; i += 4) {
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];

			const y = 0.299 * r + 0.587 * g + 0.114 * b;
			const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
			const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

			lumaSum += y;
			lumas.push(y);

			if (y > 35 && cb >= 73 && cb <= 132 && cr >= 131 && cr <= 178) {
				skinPixels++;
			}
		}

		const skinRatio = skinPixels / totalPixels;
		const meanLuma = lumaSum / totalPixels;
		let varianceSum = 0;
		for (let i = 0; i < lumas.length; i++) {
			const diff = lumas[i] - meanLuma;
			varianceSum += diff * diff;
		}
		const variance = varianceSum / totalPixels;

		return skinRatio >= 0.25 && skinRatio <= 0.85 && variance > 75;
	}

	function startFaceDetectionLoop() {
		stopFaceDetection();
		if (captureMode === 'manual') return;
		faceStatus = 'searching';
		autoCaptureCountdown = null;
		consecutiveFaceFrames = 0;

		if (typeof window !== 'undefined' && 'FaceDetector' in window) {
			try {
				faceDetector = new (window as any).FaceDetector({
					maxDetectedFaces: 1,
					fastMode: true
				});
			} catch (e) {
				faceDetector = null;
			}
		}

		// HP low-end: interval lebih lambat (600ms) untuk hemat CPU/RAM
		const intervalMs = isLowEnd ? 600 : 350;

		detectInterval = setInterval(async () => {
			if (!videoElement || !isCameraActive || capturedPhotoBase64 || captureMode === 'manual') return;

			const isFacePresent = await detectFaceReal(videoElement);

			if (isFacePresent) {
				consecutiveFaceFrames++;
				if (consecutiveFaceFrames >= 3 && faceStatus === 'searching') {
					faceStatus = 'detected';
					clearManualPromptTimer(); // Wajah ketemu, batalkan timer pop up manual
					startAutoCaptureCountdown();
				}
			} else {
				consecutiveFaceFrames = 0;
				if (faceStatus !== 'searching') {
					faceStatus = 'searching';
					cancelAutoCaptureCountdown();
				}
			}
		}, intervalMs);
	}

	function startAutoCaptureCountdown() {
		if (countdownTimer || capturedPhotoBase64) return;
		faceStatus = 'capturing';
		autoCaptureCountdown = 2;

		countdownTimer = setInterval(() => {
			if (autoCaptureCountdown !== null && autoCaptureCountdown > 1) {
				autoCaptureCountdown--;
			} else {
				cancelAutoCaptureCountdown();
				takeSnapshot();
			}
		}, 1000);
	}

	function cancelAutoCaptureCountdown() {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		autoCaptureCountdown = null;
	}

	function stopFaceDetection() {
		if (detectInterval) {
			clearInterval(detectInterval);
			detectInterval = null;
		}
		cancelAutoCaptureCountdown();
		consecutiveFaceFrames = 0;
	}

	function takeSnapshot() {
		if (!videoElement || !canvasElement || !isCameraActive) return;

		stopFaceDetection();
		clearManualPromptTimer();
		showManualPromptModal = false;

		const videoWidth = videoElement.videoWidth || (isLowEnd ? 320 : 640);
		const videoHeight = videoElement.videoHeight || (isLowEnd ? 240 : 480);

		const maxDimension = 640;
		let scale = 1;
		if (videoWidth > maxDimension || videoHeight > maxDimension) {
			scale = maxDimension / Math.max(videoWidth, videoHeight);
		}

		const width = Math.round(videoWidth * scale);
		const height = Math.round(videoHeight * scale);

		canvasElement.width = width;
		canvasElement.height = height;

		const ctx = canvasElement.getContext('2d');
		if (ctx) {
			ctx.save();
			ctx.scale(-1, 1);
			ctx.drawImage(videoElement, -width, 0, width, height);
			ctx.restore();

			const dataUrl = canvasElement.toDataURL('image/jpeg', 0.6);
			capturedPhotoBase64 = dataUrl;
			onPhotoTaken(dataUrl);
		}
	}

	async function retakePhoto() {
		capturedPhotoBase64 = null;
		onPhotoTaken('');
		await tick();
		const tracksActive = stream && stream.getVideoTracks().some((t) => t.readyState === 'live');
		if (!tracksActive || !isCameraActive) {
			await startCamera();
		} else if (videoElement) {
			videoElement.srcObject = stream;
			await videoElement.play().catch(() => {});
			if (captureMode === 'auto') {
				startFaceDetectionLoop();
				startManualPromptTimer();
			}
		}
	}

	// Reaktif terhadap perubahan autoStart — aktif saat izin diberikan dari modal
	$effect(() => {
		if (autoStart && !isCameraActive && !stream) {
			startCamera();
		}
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover relative">
	<div class="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
					<circle cx="12" cy="13" r="3"/>
				</svg>
			</div>
			<div>
				<h3 class="font-heading text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
					<span>Verifikasi Wajah ({captureMode === 'auto' ? 'Otomatis' : 'Manual'})</span>
				</h3>
				<p class="text-xs text-[#64748B] dark:text-slate-400">
					{captureMode === 'auto' ? 'Sistem memotret otomatis saat wajah terdeteksi' : 'Posisikan wajah lalu klik tombol foto di bawah'}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2 self-end sm:self-auto">
			<!-- Mode Switcher Tabs -->
			{#if !capturedPhotoBase64 && isCameraActive}
				<div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-[#E5E7EB] dark:border-slate-700">
					<button
						type="button"
						onclick={switchToAutoMode}
						class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition {captureMode === 'auto' ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'}"
					>
						⚡ Otomatis
					</button>
					<button
						type="button"
						onclick={switchToManualMode}
						class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition {captureMode === 'manual' ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'}"
					>
						📸 Manual
					</button>
				</div>
			{/if}

			<!-- Status Kamera Pill -->
			<div class="rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors {captureMode === 'manual' && !capturedPhotoBase64 ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] border border-blue-200 dark:border-blue-800/60' : faceStatus === 'capturing' || faceStatus === 'detected' || capturedPhotoBase64 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#10B981] border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400'}">
				<span class="h-2 w-2 rounded-full {captureMode === 'manual' && !capturedPhotoBase64 ? 'bg-[#2563EB]' : faceStatus === 'capturing' || faceStatus === 'detected' || capturedPhotoBase64 ? 'bg-[#10B981] animate-pulse' : 'bg-[#64748B]'}"></span>
				<span>{capturedPhotoBase64 ? 'Foto Tersimpan' : captureMode === 'manual' ? 'Mode Manual' : faceStatus === 'capturing' || faceStatus === 'detected' ? 'Wajah Terdeteksi' : 'Menunggu Wajah'}</span>
			</div>
		</div>
	</div>

	<!-- Hidden Canvas -->
	<canvas bind:this={canvasElement} class="hidden"></canvas>

	<!-- Viewport Kamera Utama -->
	<div class="relative overflow-hidden rounded-[20px] bg-slate-950 aspect-[4/5] sm:aspect-video flex items-center justify-center border-2 transition-all duration-300 {faceStatus === 'capturing' || faceStatus === 'detected' ? 'border-[#10B981] shadow-[0_0_25px_rgba(16,185,129,0.3)]' : captureMode === 'manual' && !capturedPhotoBase64 ? 'border-[#2563EB]' : 'border-slate-800'}">
		{#if capturedPhotoBase64}
			<img
				src={capturedPhotoBase64}
				alt="Foto Bukti Absensi"
				class="h-full w-full object-cover"
			/>
		{/if}

		<video
			bind:this={videoElement}
			autoplay
			playsinline
			muted
			class="h-full w-full object-cover -scale-x-100 {capturedPhotoBase64 ? 'hidden' : ''}"
		></video>

		{#if !capturedPhotoBase64 && isCameraActive}
			<!-- Animated Scanline -->
			<div class="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent animate-scanline pointer-events-none"></div>

			<!-- Oval Guide -->
			<div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
				<div class="relative w-56 h-64 sm:w-64 sm:h-72 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center {faceStatus === 'capturing' || faceStatus === 'detected' ? 'border-[#10B981] scale-105' : captureMode === 'manual' ? 'border-[#2563EB]/60 border-dashed' : 'border-white/40 border-dashed'}">
					{#if autoCaptureCountdown !== null && captureMode === 'auto'}
						<div class="flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md rounded-2xl px-6 py-3.5 border border-[#10B981]">
							<span class="font-heading text-3xl font-bold text-[#10B981]">{autoCaptureCountdown}</span>
							<span class="text-[11px] font-semibold text-white uppercase mt-0.5">Memotret Otomatis</span>
						</div>
					{:else if captureMode === 'manual'}
						<div class="absolute bottom-4 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm border border-white/10">
							Posisikan wajah di dalam bingkai
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Pop up Overlay: 10 Detik Tidak Ada Wajah Terdeteksi -->
		{#if showManualPromptModal && !capturedPhotoBase64}
			<div class="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 transition-all">
				<div class="w-full max-w-xs sm:max-w-sm rounded-[22px] border border-slate-700 bg-slate-900 p-5 text-center shadow-2xl space-y-3.5">
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
					</div>
					<div>
						<h4 class="font-heading text-base font-bold text-white">Tidak Ada Wajah yang Terdeteksi</h4>
						<p class="text-xs text-slate-300 mt-1 leading-relaxed">
							Sistem kesulitan mengenali wajah Anda secara otomatis (pencahayaan/sudut kamera). Foto manual?
						</p>
					</div>
					<div class="flex flex-col gap-2 pt-1">
						<button
							type="button"
							onclick={switchToManualMode}
							class="w-full rounded-[14px] bg-[#2563EB] hover:bg-[#1D4ED8] py-2.5 text-xs font-bold text-white shadow-md transition"
						>
							Ya, Foto Manual
						</button>
						<button
							type="button"
							onclick={retryAutoMode}
							class="w-full rounded-[14px] border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-300 transition"
						>
							Coba Otomatis Lagi
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Empty state -->
		{#if !capturedPhotoBase64 && !isCameraActive}
			<div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-8 text-center">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 mb-3">
					<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
						<circle cx="12" cy="13" r="3"/>
					</svg>
				</div>
				<p class="text-sm font-semibold text-white">Nyalakan kamera untuk memulai.</p>
				<p class="text-xs text-slate-400 mt-1 max-w-xs">
					{cameraError || 'Sistem siap memverifikasi wajah Anda secara live'}
				</p>
				{#if cameraError || !isLoadingCamera}
					<button
						type="button"
						onclick={startCamera}
						class="mt-4 rounded-[18px] bg-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition"
					>
						Aktifkan Kamera
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Tombol Shutter Mode Manual -->
	{#if captureMode === 'manual' && !capturedPhotoBase64 && isCameraActive}
		<div class="mt-4">
			<button
				type="button"
				onclick={takeSnapshot}
				class="w-full rounded-[18px] bg-[#2563EB] hover:bg-[#1D4ED8] py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 min-h-[48px]"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
					<circle cx="12" cy="13" r="4"/>
				</svg>
				Ambil Foto Sekarang (Mode Manual)
			</button>
		</div>
	{/if}

	<!-- Tombol Ulangi Foto -->
	{#if capturedPhotoBase64}
		<div class="mt-4">
			<button
				type="button"
				onclick={retakePhoto}
				class="w-full rounded-[18px] border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-100 transition min-h-[44px]"
			>
				Ambil Foto Ulang
			</button>
		</div>
	{/if}
</div>
