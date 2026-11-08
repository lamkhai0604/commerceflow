import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement modal dialogs. This stand-in only toggles the `open` state so components can be
// rendered; focus trapping and inert backgrounds are verified in real browsers by the Playwright suite.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.open = true; };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
