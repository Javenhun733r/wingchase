const STYLE_ID = 'confirm-modal-styles';

// Self-mounting Yes/No modal styled like LeaderboardHud's panel (see
// lb-backdrop/lb-panel in LeaderboardHud.js) - used instead of the native
// window.confirm() for destructive in-game choices (restart, discarding a
// save) so the prompt matches the game's look instead of the browser chrome.
export class ConfirmModal {
	#resolve = null;

	constructor(container = document.body) {
		this.#injectStyles();
		this.#buildDom(container);
		this.#wireEvents();
	}

	/**
	 * @param {Object} options
	 * @param {string} [options.title]
	 * @param {string} [options.message]
	 * @param {string} [options.confirmText]
	 * @param {string} [options.cancelText]
	 * @returns {Promise<boolean>} resolves true if confirmed, false if cancelled/dismissed.
	 */
	confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
		// Only one prompt makes sense at a time - settle any stale one as cancelled.
		this.#settle(false);

		this.titleEl.textContent = title;
		this.messageEl.textContent = message;
		this.confirmBtnEl.textContent = confirmText;
		this.cancelBtnEl.textContent = cancelText;

		this.backdropEl.classList.remove('cm-hidden');
		this.confirmBtnEl.focus();

		return new Promise(resolve => {
			this.#resolve = resolve;
		});
	}

	#settle(result) {
		if (!this.#resolve) return;
		const resolve = this.#resolve;
		this.#resolve = null;
		this.backdropEl.classList.add('cm-hidden');
		resolve(result);
	}

	#buildDom(container) {
		this.rootEl = document.createElement('div');
		this.rootEl.className = 'cm-root';
		this.rootEl.innerHTML = `
			<div class="cm-backdrop cm-hidden">
				<div class="cm-panel" role="alertdialog" aria-modal="true">
					<h2 class="cm-title"></h2>
					<p class="cm-message"></p>
					<div class="cm-actions">
						<button class="cm-cancel"></button>
						<button class="cm-confirm"></button>
					</div>
				</div>
			</div>
		`;
		container.appendChild(this.rootEl);

		this.backdropEl = this.rootEl.querySelector('.cm-backdrop');
		this.titleEl = this.rootEl.querySelector('.cm-title');
		this.messageEl = this.rootEl.querySelector('.cm-message');
		this.confirmBtnEl = this.rootEl.querySelector('.cm-confirm');
		this.cancelBtnEl = this.rootEl.querySelector('.cm-cancel');
	}

	#wireEvents() {
		this.confirmBtnEl.addEventListener('click', () => this.#settle(true));
		this.cancelBtnEl.addEventListener('click', () => this.#settle(false));
		this.backdropEl.addEventListener('click', event => {
			if (event.target === this.backdropEl) this.#settle(false);
		});
		// InputManager binds Escape/Space/Enter on `window` (bubble phase runs
		// document before window), so swallowing every key here while open stops
		// the game's pause-toggle/activate from also firing on the same keypress.
		document.addEventListener('keydown', event => {
			if (this.backdropEl.classList.contains('cm-hidden')) return;
			event.stopPropagation();
			if (event.key === 'Escape') this.#settle(false);
		});
	}

	#injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			.cm-backdrop {
				position: fixed;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				background: rgba(5, 5, 15, 0.75);
				backdrop-filter: blur(6px);
				-webkit-backdrop-filter: blur(6px);
				z-index: 40;
				opacity: 1;
				visibility: visible;
				transition: opacity 0.2s ease, visibility 0.2s;
				font-family: var(--font-body, 'Segoe UI', system-ui, sans-serif);
			}
			.cm-hidden { opacity: 0; visibility: hidden; pointer-events: none; }
			.cm-panel {
				width: min(360px, 90vw);
				background: #0d1524;
				border: 1px solid rgba(79, 172, 254, 0.35);
				border-radius: 14px;
				padding: 20px 22px;
				color: #e8f6ff;
				text-align: center;
				box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
				transform: scale(1) translateY(0);
				transition: transform 0.2s ease;
			}
			.cm-backdrop.cm-hidden .cm-panel { transform: scale(0.94) translateY(10px); }
			.cm-title { margin: 0 0 8px; font-family: var(--font-display, inherit); font-size: 19px; font-weight: 700; color: #6ff7ff; letter-spacing: 0.3px; }
			.cm-message { margin: 0 0 18px; font-size: 14px; color: #b8c6d9; line-height: 1.4; }
			.cm-actions { display: flex; gap: 10px; justify-content: center; }
			.cm-actions button {
				flex: 1;
				padding: 10px 16px;
				font-size: 14px;
				font-weight: 600;
				border-radius: 999px;
				cursor: pointer;
				transition: transform 0.15s ease, filter 0.15s ease, background 0.15s ease;
			}
			.cm-actions button:active { transform: scale(0.97); }
			.cm-confirm {
				border: none;
				color: #05121a;
				background: linear-gradient(135deg, #6ff7ff, #4facfe);
				box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
			}
			.cm-confirm:hover { filter: brightness(1.08); transform: translateY(-1px); }
			.cm-cancel {
				border: 1px solid #4facfe;
				color: #6ff7ff;
				background: transparent;
			}
			.cm-cancel:hover { background: rgba(79, 172, 254, 0.12); }
			.cm-actions button:focus-visible {
				outline: 2px solid #4facfe;
				outline-offset: 2px;
			}
		`;
		document.head.appendChild(style);
	}
}
