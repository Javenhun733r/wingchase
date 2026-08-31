import {
	getAudioVolume,
	initPix3l,
	isAudioAvailable,
	isAudioMuted,
	onAudioChange,
	setAudioVolume,
} from './Pix3lManager.js';

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
const VOLUME_STORAGE_KEY = 'wingchase:audioVolume';

// Best-effort cache so the player's volume choice survives a reload when
// running standalone/offline (no PIX3L SDK to persist it for us). Never
// throws - private browsing / storage-full just means no persistence.
function readStoredVolume() {
	try {
		const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
		const parsed = raw === null ? null : Number(raw);
		return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : null;
	} catch {
		return null;
	}
}

function writeStoredVolume(value) {
	try {
		localStorage.setItem(VOLUME_STORAGE_KEY, String(value));
	} catch {
		// ignore
	}
}

// Owns the <audio id="bg-sound"> loop, the only thing actually capable of
// producing sound - PIX3L.audio is a read-only settings source (volume/mute),
// it does not play or mix audio itself. Degrades to plain local playback
// (default volume, unmuted) if PIX3L or its audio module is unavailable.
export class AudioManager {
	constructor() {
		this.el = document.getElementById('bg-sound');
		this.audioBar = document.getElementById('audio-bar');
		this.toggleButton = document.getElementById('audio-toggle');
		this.volumeSlider = document.getElementById('audio-volume');

		if (this.el) {
			this.el.loop = true;
			// Apply PIX3L's last-known values before the first frame of audio
			// plays (per SDK guidance) in case it was already injected before
			// this constructor ran; re-applied/confirmed in syncFromSdk once
			// initPix3l() resolves.
			this.el.volume = readStoredVolume() ?? getAudioVolume();
			this.el.muted = isAudioMuted();
		}
		this.updateControls();

		this.armAutoplay();
		this.toggleButton?.addEventListener('click', () => this.toggleVolumePanel());
		this.volumeSlider?.addEventListener('input', e => this.setVolume(Number(e.target.value)));

		initPix3l().then(() => this.syncFromSdk());
	}

	syncFromSdk() {
		if (!isAudioAvailable()) {
			console.warn(
				'[AudioManager] PIX3L.audio is unavailable (standalone/offline run, or the SDK has no audio module) - continuing with local audio defaults instead of platform-synced volume/mute.'
			);
			return;
		}
		if (this.el) {
			this.el.volume = getAudioVolume();
			this.el.muted = isAudioMuted();
			this.updateControls();
		}
		onAudioChange(settings => this.applySettings(settings));
	}

	applySettings(settings = {}) {
		if (this.el) {
			if (typeof settings.volume === 'number') this.el.volume = settings.volume;
			if (typeof settings.muted === 'boolean') this.el.muted = settings.muted;
		}
		this.updateControls();
	}

	// Browsers block audio with sound until the user has interacted with the
	// page, so try immediately and otherwise wait for the first input.
	armAutoplay() {
		if (!this.el) return;
		this.tryPlay();
		const unlock = () => {
			this.tryPlay();
			UNLOCK_EVENTS.forEach(type => window.removeEventListener(type, unlock));
		};
		UNLOCK_EVENTS.forEach(type => window.addEventListener(type, unlock, { once: true }));
	}

	tryPlay() {
		this.el?.play().catch(() => {
			// Still locked - the armAutoplay() interaction listeners will retry.
		});
	}

	setVolume(value) {
		const clamped = Math.min(Math.max(value, 0), 1);
		if (this.el) this.el.volume = clamped;
		setAudioVolume(clamped);
		writeStoredVolume(clamped);
		this.updateControls();
	}

	toggleVolumePanel() {
		this.audioBar?.classList.toggle('expanded');
	}

	// Mute (PIX3L-driven or explicit) and a volume dragged down to 0 both
	// read as "muted" on the icon, even though only the former is real mute
	// state - the player experiences both as silence.
	updateControls() {
		const looksMuted = (this.el?.muted ?? false) || (this.el?.volume ?? 1) === 0;
		if (this.toggleButton) {
			this.toggleButton.textContent = looksMuted ? '🔇' : '🔊';
			this.toggleButton.setAttribute('aria-pressed', String(looksMuted));
			this.toggleButton.setAttribute('aria-label', looksMuted ? 'Unmute music' : 'Mute music');
		}
		if (this.volumeSlider && this.el) this.volumeSlider.value = String(this.el.volume);
	}
}
